import datetime
import sqlite3

from .config import BUILD_DIR, DATABASE_PATH

SCHEMA = """
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE countries (
    id INTEGER PRIMARY KEY,
    code TEXT,
    wikidata_id TEXT NOT NULL
);
CREATE TABLE country_names (
    country_id INTEGER NOT NULL REFERENCES countries (id),
    language TEXT NOT NULL,
    name TEXT NOT NULL,
    PRIMARY KEY (country_id, language)
) WITHOUT ROWID;
CREATE TABLE leagues (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    country_id INTEGER REFERENCES countries (id)
);
CREATE TABLE markets (
    code TEXT PRIMARY KEY,
    language TEXT NOT NULL,
    home_league_code TEXT REFERENCES leagues (code)
);
CREATE TABLE clubs (
    id INTEGER PRIMARY KEY,
    league_code TEXT NOT NULL REFERENCES leagues (code),
    transfermarkt_id INTEGER NOT NULL,
    wikidata_id TEXT
);
CREATE TABLE club_names (
    club_id INTEGER NOT NULL REFERENCES clubs (id),
    language TEXT NOT NULL,
    name TEXT NOT NULL,
    PRIMARY KEY (club_id, language)
) WITHOUT ROWID;
CREATE TABLE players (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    birth_date TEXT,
    position TEXT,
    sitelinks INTEGER NOT NULL,
    highest_market_value_eur INTEGER,
    international_caps INTEGER,
    commons_file TEXT,
    transfermarkt_id INTEGER,
    wikidata_id TEXT
);
CREATE TABLE player_names (
    player_id INTEGER NOT NULL REFERENCES players (id),
    name TEXT NOT NULL,
    normalized TEXT NOT NULL
);
CREATE TABLE player_fame (
    player_id INTEGER NOT NULL REFERENCES players (id),
    market TEXT NOT NULL REFERENCES markets (code),
    fame INTEGER NOT NULL,
    recent_views INTEGER NOT NULL,
    PRIMARY KEY (player_id, market)
) WITHOUT ROWID;
CREATE TABLE player_countries (
    player_id INTEGER NOT NULL REFERENCES players (id),
    country_id INTEGER NOT NULL REFERENCES countries (id),
    is_primary INTEGER NOT NULL,
    PRIMARY KEY (player_id, country_id)
) WITHOUT ROWID;
CREATE TABLE player_clubs (
    player_id INTEGER NOT NULL REFERENCES players (id),
    club_id INTEGER NOT NULL REFERENCES clubs (id),
    first_year INTEGER,
    last_year INTEGER,
    appearances INTEGER NOT NULL,
    source TEXT NOT NULL,
    is_confirmed INTEGER NOT NULL,
    PRIMARY KEY (player_id, club_id)
) WITHOUT ROWID;
CREATE INDEX player_names_normalized ON player_names (normalized);
CREATE INDEX player_names_player ON player_names (player_id);
CREATE INDEX player_fame_market ON player_fame (market, fame);
CREATE INDEX player_countries_country ON player_countries (country_id);
CREATE INDEX player_clubs_club ON player_clubs (club_id);
"""


def name_rows(records):
    return [(record["id"], language, name) for record in records for language, name in record["names"].items()]


def write(dataset):
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    DATABASE_PATH.unlink(missing_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.executescript(SCHEMA)

    countries = dataset["countries"]
    clubs = dataset["clubs"].values()
    connection.executemany(
        "INSERT INTO countries VALUES (?, ?, ?)",
        [(country["id"], country["code"], country["wikidata_id"]) for country in countries.values()],
    )
    connection.executemany("INSERT INTO country_names VALUES (?, ?, ?)", name_rows(countries.values()))
    connection.executemany(
        "INSERT INTO leagues VALUES (?, ?, ?)",
        [
            (league["code"], league["name"], countries.get(league["country_wikidata_id"], {}).get("id"))
            for league in dataset["leagues"].values()
        ],
    )
    connection.executemany(
        "INSERT INTO markets VALUES (?, ?, ?)",
        [(market["code"], market["language"], market["home_league"] or None) for market in dataset["markets"]],
    )
    connection.executemany(
        "INSERT INTO clubs VALUES (?, ?, ?, ?)",
        [(club["id"], club["league"], club["id"], club["wikidata_id"]) for club in clubs],
    )
    connection.executemany("INSERT INTO club_names VALUES (?, ?, ?)", name_rows(clubs))
    connection.executemany(
        "INSERT INTO players VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
            (
                player["id"],
                player["name"],
                player["birth_date"],
                player["position"],
                player["sitelinks"],
                player["highest_market_value_eur"],
                player["international_caps"],
                player["commons_file"],
                player["transfermarkt_id"],
                player["wikidata_id"],
            )
            for player in dataset["players"]
        ],
    )
    connection.executemany("INSERT INTO player_names VALUES (?, ?, ?)", dataset["player_names"])
    connection.executemany("INSERT INTO player_fame VALUES (?, ?, ?, ?)", dataset["player_fame"])
    connection.executemany("INSERT INTO player_countries VALUES (?, ?, ?)", dataset["player_countries"])
    connection.executemany("INSERT INTO player_clubs VALUES (?, ?, ?, ?, ?, ?, ?)", dataset["player_clubs"])
    connection.execute(
        "INSERT INTO meta VALUES ('built_at', ?)", (datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),)
    )
    connection.commit()
    connection.execute("VACUUM")
    connection.close()
    return DATABASE_PATH
