import json
import sqlite3

from .config import APP_DATABASE_PATH, APP_VERSION_PATH, DATABASE_PATH

SCHEMA_VERSION = 1
MINIMUM_STORED_FAME = 20

SCHEMA = """
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE markets (
    code TEXT PRIMARY KEY,
    language TEXT NOT NULL,
    home_league_code TEXT
);
CREATE TABLE countries (
    id INTEGER PRIMARY KEY,
    code TEXT
);
CREATE TABLE country_names (
    country_id INTEGER NOT NULL,
    language TEXT NOT NULL,
    name TEXT NOT NULL,
    PRIMARY KEY (country_id, language)
) WITHOUT ROWID;
CREATE TABLE clubs (
    id INTEGER PRIMARY KEY,
    league_code TEXT NOT NULL
);
CREATE TABLE club_names (
    club_id INTEGER NOT NULL,
    language TEXT NOT NULL,
    name TEXT NOT NULL,
    PRIMARY KEY (club_id, language)
) WITHOUT ROWID;
CREATE TABLE players (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    birth_year INTEGER,
    position TEXT,
    country_id INTEGER
);
CREATE TABLE player_clubs (
    club_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    PRIMARY KEY (club_id, player_id)
) WITHOUT ROWID;
CREATE TABLE player_fame (
    market TEXT NOT NULL,
    player_id INTEGER NOT NULL,
    fame INTEGER NOT NULL,
    PRIMARY KEY (market, player_id)
) WITHOUT ROWID;
CREATE VIRTUAL TABLE player_search USING fts5 (
    normalized,
    player_id UNINDEXED,
    tokenize = 'ascii',
    prefix = '2 3',
    detail = 'none'
);
CREATE TABLE grid_levels (
    difficulty INTEGER PRIMARY KEY,
    minimum_fame INTEGER NOT NULL,
    minimum_answers INTEGER NOT NULL
);
CREATE TABLE grids (
    id INTEGER PRIMARY KEY,
    market TEXT NOT NULL,
    difficulty INTEGER NOT NULL
);
CREATE TABLE grid_headers (
    grid_id INTEGER NOT NULL,
    axis TEXT NOT NULL,
    position INTEGER NOT NULL,
    kind TEXT NOT NULL,
    reference_id INTEGER NOT NULL,
    PRIMARY KEY (grid_id, axis, position)
) WITHOUT ROWID;
CREATE INDEX players_country ON players (country_id);
CREATE INDEX player_clubs_player ON player_clubs (player_id);
CREATE INDEX grids_market_difficulty ON grids (market, difficulty);
"""

COPIES = (
    "INSERT INTO markets SELECT code, language, home_league_code FROM source.markets",
    "INSERT INTO clubs SELECT id, league_code FROM source.clubs",
    "INSERT INTO club_names SELECT club_id, language, name FROM source.club_names",
    "INSERT INTO players SELECT p.id, p.name, CAST(substr(p.birth_date, 1, 4) AS INTEGER), p.position, "
    "(SELECT pc.country_id FROM source.player_countries pc WHERE pc.player_id = p.id AND pc.is_primary = 1) "
    "FROM source.players p WHERE p.id IN (SELECT player_id FROM source.player_clubs)",
    "INSERT INTO player_clubs SELECT club_id, player_id FROM source.player_clubs",
    f"INSERT INTO player_fame SELECT market, player_id, fame FROM source.player_fame WHERE fame >= {MINIMUM_STORED_FAME} "
    "AND player_id IN (SELECT id FROM players)",
    "INSERT INTO player_search (normalized, player_id) SELECT DISTINCT normalized, player_id FROM source.player_names "
    "WHERE player_id IN (SELECT id FROM players)",
    "INSERT INTO grid_levels SELECT difficulty, minimum_fame, minimum_answers FROM source.grid_levels",
    "INSERT INTO grids SELECT id, market, difficulty FROM source.grids",
    "INSERT INTO grid_headers SELECT grid_id, axis, position, kind, reference_id FROM source.grid_headers",
    "INSERT INTO countries SELECT id, code FROM source.countries WHERE id IN (SELECT country_id FROM players) "
    "OR id IN (SELECT reference_id FROM grid_headers WHERE kind = 'country')",
    "INSERT INTO country_names SELECT country_id, language, name FROM source.country_names "
    "WHERE country_id IN (SELECT id FROM countries)",
)


def write(source_path=DATABASE_PATH, target_path=APP_DATABASE_PATH):
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.unlink(missing_ok=True)
    connection = sqlite3.connect(target_path)
    connection.executescript(SCHEMA)
    connection.execute("ATTACH DATABASE ? AS source", (str(source_path),))
    for statement in COPIES:
        connection.execute(statement)
    built_at = connection.execute("SELECT value FROM source.meta WHERE key = 'built_at'").fetchone()[0]
    connection.executemany(
        "INSERT INTO meta VALUES (?, ?)", [("built_at", built_at), ("schema_version", str(SCHEMA_VERSION))]
    )
    connection.execute("INSERT INTO player_search (player_search) VALUES ('optimize')")
    connection.commit()
    connection.execute("DETACH DATABASE source")
    connection.execute("VACUUM")
    connection.close()

    version = "".join(character for character in built_at if character.isdigit())[:14]
    APP_VERSION_PATH.write_text(
        json.dumps({"schemaVersion": SCHEMA_VERSION, "dataVersion": version}, indent=2) + "\n", encoding="utf-8"
    )
    return target_path
