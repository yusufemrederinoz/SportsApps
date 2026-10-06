import datetime
import sqlite3

from .config import BUILD_DIR, DATABASE_PATH

SCHEMA = """
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE countries (
    id INTEGER PRIMARY KEY,
    code TEXT,
    name_tr TEXT NOT NULL,
    name_en TEXT NOT NULL,
    wikidata_id TEXT NOT NULL
);
CREATE TABLE leagues (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    country_id INTEGER REFERENCES countries (id)
);
CREATE TABLE clubs (
    id INTEGER PRIMARY KEY,
    name_tr TEXT NOT NULL,
    name_en TEXT NOT NULL,
    league_code TEXT NOT NULL REFERENCES leagues (code),
    transfermarkt_id INTEGER NOT NULL,
    wikidata_id TEXT
);
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
    PRIMARY KEY (player_id, club_id)
) WITHOUT ROWID;
CREATE INDEX player_names_normalized ON player_names (normalized);
CREATE INDEX player_names_player ON player_names (player_id);
CREATE INDEX player_countries_country ON player_countries (country_id);
CREATE INDEX player_clubs_club ON player_clubs (club_id);
"""


def write(dataset):
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    DATABASE_PATH.unlink(missing_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.executescript(SCHEMA)

    countries = dataset["countries"]
    connection.executemany(
        "INSERT INTO countries VALUES (?, ?, ?, ?, ?)",
        [
            (
                country["id"],
                country["code"],
                country.get("tr") or country.get("en") or country["wikidata_id"],
                country.get("en") or country.get("tr") or country["wikidata_id"],
                country["wikidata_id"],
            )
            for country in countries.values()
        ],
    )
    connection.executemany(
        "INSERT INTO leagues VALUES (?, ?, ?)",
        [
            (league["code"], league["name"], countries.get(league["country_wikidata_id"], {}).get("id"))
            for league in dataset["leagues"].values()
        ],
    )
    connection.executemany(
        "INSERT INTO clubs VALUES (?, ?, ?, ?, ?, ?)",
        [
            (club["id"], club["name_tr"], club["name_en"], club["league"], club["id"], club["wikidata_id"])
            for club in dataset["clubs"].values()
        ],
    )
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
    connection.executemany("INSERT INTO player_countries VALUES (?, ?, ?)", dataset["player_countries"])
    connection.executemany("INSERT INTO player_clubs VALUES (?, ?, ?, ?, ?, ?)", dataset["player_clubs"])
    connection.execute(
        "INSERT INTO meta VALUES ('built_at', ?)", (datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),)
    )
    connection.commit()
    connection.execute("VACUUM")
    connection.close()
    return DATABASE_PATH
