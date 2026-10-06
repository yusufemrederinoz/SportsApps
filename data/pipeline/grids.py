import random
import sqlite3
from collections import Counter, defaultdict
from dataclasses import dataclass
from itertools import combinations

from .config import DATABASE_PATH

SEED = 20261006
MAX_ATTEMPTS = 50_000
HOME_ANCHOR_SHARE = 0.6
MAX_HEADER_SHARE = 0.3
HEADER_WARMUP = 30
COUNTRY_HEADER_COUNTS = (0, 1, 2)
COUNTRY_HEADER_WEIGHTS = (0.5, 0.35, 0.15)

SCHEMA = """
DROP TABLE IF EXISTS grid_headers;
DROP TABLE IF EXISTS grids;
CREATE TABLE grids (
    id INTEGER PRIMARY KEY,
    market TEXT NOT NULL REFERENCES markets (code),
    difficulty INTEGER NOT NULL,
    scarcest_cell INTEGER NOT NULL
);
CREATE TABLE grid_headers (
    grid_id INTEGER NOT NULL REFERENCES grids (id),
    axis TEXT NOT NULL,
    position INTEGER NOT NULL,
    kind TEXT NOT NULL,
    reference_id INTEGER NOT NULL,
    PRIMARY KEY (grid_id, axis, position)
) WITHOUT ROWID;
CREATE INDEX grids_market_difficulty ON grids (market, difficulty);
"""


@dataclass(frozen=True)
class Level:
    difficulty: int
    fame: int
    answers: int
    home_clubs: int
    foreign_clubs: int
    countries: int
    target: int


@dataclass(frozen=True)
class Market:
    code: str
    home_league: str | None


LEVELS = (
    Level(difficulty=1, fame=50, answers=3, home_clubs=4, foreign_clubs=20, countries=10, target=1500),
    Level(difficulty=2, fame=42, answers=3, home_clubs=12, foreign_clubs=45, countries=14, target=1500),
    Level(difficulty=3, fame=32, answers=3, home_clubs=30, foreign_clubs=130, countries=30, target=1500),
)


def load_markets(connection):
    return [Market(code, home_league) for code, home_league in connection.execute("SELECT code, home_league_code FROM markets")]


def load_answers(connection, market, level):
    answers = defaultdict(set)
    home = set()
    club_rows = connection.execute(
        "SELECT c.id, c.league_code, pc.player_id FROM player_clubs pc "
        "JOIN player_fame f ON f.player_id = pc.player_id JOIN clubs c ON c.id = pc.club_id "
        "WHERE pc.is_confirmed = 1 AND f.market = ? AND f.fame >= ?",
        (market.code, level.fame),
    )
    for club_id, league_code, player_id in club_rows:
        answers[("club", club_id)].add(player_id)
        if league_code == market.home_league:
            home.add(("club", club_id))
    country_rows = connection.execute(
        "SELECT pc.country_id, pc.player_id FROM player_countries pc JOIN player_fame f ON f.player_id = pc.player_id "
        "WHERE pc.is_primary = 1 AND f.market = ? AND f.fame >= ?",
        (market.code, level.fame),
    )
    for country_id, player_id in country_rows:
        answers[("country", country_id)].add(player_id)
    return answers, home


def select_pool(answers, home, level):
    ranked = sorted(answers, key=lambda header: (-len(answers[header]), header))
    clubs = [header for header in ranked if header[0] == "club"]
    pool = [header for header in clubs if header in home][: level.home_clubs]
    pool += [header for header in clubs if header not in home][: level.foreign_clubs]
    pool += [header for header in ranked if header[0] == "country"][: level.countries]
    return pool


def compatibility(pool, answers, minimum):
    neighbors = defaultdict(set)
    for first, second in combinations(pool, 2):
        if first[0] == "country" and second[0] == "country":
            continue
        if len(answers[first] & answers[second]) >= minimum:
            neighbors[first].add(second)
            neighbors[second].add(first)
    return neighbors


def has_distinct_answers(cells):
    assigned = {}

    def place(index, visited):
        for player_id in cells[index]:
            if player_id in visited:
                continue
            visited.add(player_id)
            if player_id not in assigned or place(assigned[player_id], visited):
                assigned[player_id] = index
                return True
        return False

    return all(place(index, set()) for index in range(len(cells)))


def generate(connection, market, level, generator, taken):
    answers, home = load_answers(connection, market, level)
    pool = select_pool(answers, home, level)
    neighbors = compatibility(pool, answers, level.answers)
    clubs = [header for header in pool if header[0] == "club"]
    anchors = [header for header in clubs if header in home]
    usage = Counter()
    grids = {}

    def available(candidates):
        limit = max(HEADER_WARMUP, MAX_HEADER_SHARE * len(grids))
        return [header for header in candidates if usage[header] < limit]

    def pick(candidates, count):
        remaining = list(candidates)
        chosen = []
        for _ in range(count):
            weights = [1 / (1 + usage[header]) for header in remaining]
            choice = generator.choices(remaining, weights)[0]
            remaining.remove(choice)
            chosen.append(choice)
        return chosen

    def shared_columns(rows):
        common = set.intersection(*(neighbors[row] for row in rows)) - set(rows)
        return available(sorted(common))

    def extendable(rows, candidate):
        columns = shared_columns(rows + [candidate])
        return len(columns) >= 3 and any(header[0] == "club" for header in columns)

    attempts = 0
    while len(grids) < level.target and attempts < MAX_ATTEMPTS:
        attempts += 1
        open_anchors = available(anchors)
        rows = pick(open_anchors, 1) if open_anchors and generator.random() < HOME_ANCHOR_SHARE else []
        while len(rows) < 3:
            candidates = [header for header in available(clubs) if header not in rows and extendable(rows, header)]
            if not candidates:
                break
            rows += pick(candidates, 1)
        if len(rows) < 3:
            continue
        shared = shared_columns(rows)
        shared_countries = [header for header in shared if header[0] == "country"]
        shared_clubs = [header for header in shared if header[0] == "club"]
        country_count = min(generator.choices(COUNTRY_HEADER_COUNTS, COUNTRY_HEADER_WEIGHTS)[0], len(shared_countries))
        if len(shared_clubs) < 3 - country_count:
            continue
        columns = pick(shared_clubs, 3 - country_count) + pick(shared_countries, country_count)
        key = frozenset((frozenset(rows), frozenset(columns)))
        if key in taken:
            continue
        cells = [answers[row] & answers[column] for row in rows for column in columns]
        if not has_distinct_answers(cells):
            continue
        generator.shuffle(rows)
        generator.shuffle(columns)
        if generator.random() < 0.5:
            rows, columns = columns, rows
        grids[key] = (rows, columns, min(len(cell) for cell in cells))
        taken.add(key)
        usage.update(rows + columns)

    summary = {
        "market": market.code,
        "difficulty": level.difficulty,
        "grids": len(grids),
        "attempts": attempts,
        "pool": len(pool),
        "headers_used": len(usage),
        "busiest_header_share": max(usage.values()) / len(grids) if grids else 0,
    }
    return list(grids.values()), summary


def write(database_path=DATABASE_PATH):
    connection = sqlite3.connect(database_path)
    connection.executescript(SCHEMA)
    generator = random.Random(SEED)
    summaries = []
    grid_id = 0
    for market in load_markets(connection):
        taken = set()
        for level in LEVELS:
            grids, summary = generate(connection, market, level, generator, taken)
            summaries.append(summary)
            for rows, columns, scarcest_cell in grids:
                grid_id += 1
                connection.execute(
                    "INSERT INTO grids VALUES (?, ?, ?, ?)", (grid_id, market.code, level.difficulty, scarcest_cell)
                )
                connection.executemany(
                    "INSERT INTO grid_headers VALUES (?, ?, ?, ?, ?)",
                    [(grid_id, "row", position, kind, reference_id) for position, (kind, reference_id) in enumerate(rows)]
                    + [
                        (grid_id, "column", position, kind, reference_id)
                        for position, (kind, reference_id) in enumerate(columns)
                    ],
                )
    connection.commit()
    connection.close()
    return summaries
