import csv
import datetime
import shutil
import sqlite3
import urllib.request
from collections import defaultdict

from . import wikidata
from .config import CACHE_DIR, DATABASE_PATH, USER_AGENT

PERFORMANCES_URL = (
    "https://media.githubusercontent.com/media/salimt/football-datasets/main/"
    "datalake/transfermarkt/player_performances/player_performances.csv"
)
PERFORMANCES_PATH = CACHE_DIR / "performances" / "player_performances.csv"
MINIMUM_FALLBACK_FAME = 20
LATEST_DEBUT_AGE = 20
WIKIDATA_BATCH = 200
WIKIDATA_COMPLETE_SHARE = 0.75
NATIONAL_TEAM = "wd:Q1194951"

TABLES = """
DROP TABLE IF EXISTS player_stats;
DROP TABLE IF EXISTS player_club_stats;
CREATE TABLE player_stats (
    player_id INTEGER PRIMARY KEY REFERENCES players (id),
    source TEXT NOT NULL,
    appearances INTEGER NOT NULL,
    goals INTEGER NOT NULL,
    assists INTEGER,
    yellow_cards INTEGER,
    red_cards INTEGER,
    first_season INTEGER,
    is_complete INTEGER NOT NULL
);
CREATE TABLE player_club_stats (
    player_id INTEGER NOT NULL REFERENCES players (id),
    club_id INTEGER NOT NULL REFERENCES clubs (id),
    appearances INTEGER NOT NULL,
    goals INTEGER NOT NULL,
    assists INTEGER NOT NULL,
    PRIMARY KEY (player_id, club_id)
) WITHOUT ROWID;
"""


def whole(value):
    try:
        return int(float(value)) if value not in ("", None) else 0
    except ValueError:
        return 0


def season_year(label):
    text = (label or "").strip()
    if len(text) == 5 and text[2] == "/" and text[:2].isdigit():
        short = int(text[:2])
        return (1900 if short >= 50 else 2000) + short
    return int(text) if len(text) == 4 and text.isdigit() else None


def covers_career(first_season, birth_year):
    return first_season is not None and birth_year is not None and first_season <= birth_year + LATEST_DEBUT_AGE


def download(refresh=False):
    if PERFORMANCES_PATH.exists() and not refresh:
        return PERFORMANCES_PATH
    PERFORMANCES_PATH.parent.mkdir(parents=True, exist_ok=True)
    partial = PERFORMANCES_PATH.with_suffix(".partial")
    request = urllib.request.Request(PERFORMANCES_URL, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=1800) as response, open(partial, "wb") as target:
        shutil.copyfileobj(response, target)
    partial.replace(PERFORMANCES_PATH)
    return PERFORMANCES_PATH


def source_ids(connection):
    by_wikidata = defaultdict(set)
    for row in wikidata.transfermarkt_player_ids():
        if row["transfermarkt"].isdigit():
            by_wikidata[wikidata.entity_id(row["player"])].add(int(row["transfermarkt"]))
    candidates = {}
    for player_id, own, entity in connection.execute("SELECT id, transfermarkt_id, wikidata_id FROM players"):
        candidates[player_id] = [own] if own else sorted(by_wikidata.get(entity or "", ()))
    return candidates


def read_performances(wanted, refresh=False):
    careers = {}
    with open(download(refresh), encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            source_id = int(row["player_id"])
            if source_id not in wanted:
                continue
            career = careers.setdefault(
                source_id,
                {"appearances": 0, "goals": 0, "assists": 0, "yellow": 0, "red": 0, "first": None, "clubs": {}},
            )
            appearances, goals, assists = whole(row["nb_on_pitch"]), whole(row["goals"]), whole(row["assists"])
            career["appearances"] += appearances
            career["goals"] += goals
            career["assists"] += assists
            career["yellow"] += whole(row["yellow_cards"])
            career["red"] += whole(row["second_yellow_cards"]) + whole(row["direct_red_cards"])
            year = season_year(row["season_name"])
            if year is not None and (career["first"] is None or year < career["first"]):
                career["first"] = year
            club = career["clubs"].setdefault(whole(row["team_id"]), [0, 0, 0])
            club[0] += appearances
            club[1] += goals
            club[2] += assists
    return careers


def wikidata_careers(entities):
    careers = {}
    ordered = sorted(entities, key=wikidata.entity_number)
    for offset in range(0, len(ordered), WIKIDATA_BATCH):
        scope = "VALUES ?player { %s } ?player p:P54 ?statement . ?statement ps:P54 ?team . " % wikidata.values(
            ordered[offset : offset + WIKIDATA_BATCH]
        )
        club_only = "FILTER NOT EXISTS { ?team wdt:P31/wdt:P279* %s } " % NATIONAL_TEAM
        spells = wikidata.select(
            f"career-spells-{offset}",
            "SELECT ?player (COUNT(?statement) AS ?spells) WHERE { %s%s} GROUP BY ?player" % (scope, club_only),
        )
        counted = wikidata.select(
            f"career-totals-{offset}",
            "SELECT ?player (COUNT(?statement) AS ?counted) (SUM(?goals) AS ?goalTotal) (SUM(?matches) AS ?matchTotal) "
            "WHERE { %s?statement pq:P1351 ?goals . OPTIONAL { ?statement pq:P1350 ?matches } %s} GROUP BY ?player"
            % (scope, club_only),
        )
        total_spells = {wikidata.entity_id(row["player"]): whole(row.get("spells")) for row in spells}
        for row in counted:
            entity = wikidata.entity_id(row["player"])
            if row.get("goalTotal") in (None, ""):
                continue
            share = whole(row.get("counted")) / max(1, total_spells.get(entity, 0))
            careers[entity] = {
                "appearances": whole(row.get("matchTotal")),
                "goals": whole(row.get("goalTotal")),
                "complete": share >= WIKIDATA_COMPLETE_SHARE,
            }
    return careers


def write(database_path=DATABASE_PATH, refresh=False):
    connection = sqlite3.connect(database_path)
    candidates = source_ids(connection)
    wanted = {source_id for ids in candidates.values() for source_id in ids}
    performances = read_performances(wanted, refresh)
    clubs = {row[0] for row in connection.execute("SELECT id FROM clubs")}
    births = {
        player_id: int(birth[:4]) if birth and birth[:4].isdigit() else None
        for player_id, birth in connection.execute("SELECT id, birth_date FROM players")
    }

    stats = []
    club_stats = []
    covered = set()
    for player_id, ids in candidates.items():
        source_id = next((candidate for candidate in ids if candidate in performances), None)
        if source_id is None:
            continue
        career = performances[source_id]
        covered.add(player_id)
        stats.append(
            (
                player_id,
                "performances",
                career["appearances"],
                career["goals"],
                career["assists"],
                career["yellow"],
                career["red"],
                career["first"],
                int(covers_career(career["first"], births.get(player_id))),
            )
        )
        for club_id, (appearances, goals, assists) in career["clubs"].items():
            if club_id in clubs:
                club_stats.append((player_id, club_id, appearances, goals, assists))

    famous = {
        player_id: entity
        for player_id, entity in connection.execute(
            "SELECT p.id, p.wikidata_id FROM players p WHERE p.wikidata_id IS NOT NULL AND p.id IN "
            "(SELECT player_id FROM player_fame WHERE fame >= ?)",
            (MINIMUM_FALLBACK_FAME,),
        )
        if player_id not in covered
    }
    fallback = wikidata_careers(set(famous.values()))
    for player_id, entity in famous.items():
        career = fallback.get(entity)
        if career:
            stats.append(
                (player_id, "wikidata", career["appearances"], career["goals"], None, None, None, None, int(career["complete"]))
            )

    connection.executescript(TABLES)
    connection.executemany("INSERT INTO player_stats VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", stats)
    connection.executemany("INSERT INTO player_club_stats VALUES (?, ?, ?, ?, ?)", club_stats)
    connection.execute(
        "INSERT OR REPLACE INTO meta VALUES ('stats_at', ?)",
        (datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),),
    )
    connection.commit()
    connection.close()
    return {
        "players": len(stats),
        "from_performances": len(covered),
        "from_wikidata": len(stats) - len(covered),
        "club_rows": len(club_stats),
    }
