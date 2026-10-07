import datetime
import sqlite3

from pipeline import bundle
from pipeline.config import DATABASE_PATH

from .config import OUTPUT_DIR
from .sources import load_metadata

TABLE = """
CREATE TABLE IF NOT EXISTS player_portraits (
    player_id INTEGER PRIMARY KEY REFERENCES players (id),
    author TEXT NOT NULL,
    license TEXT NOT NULL,
    license_url TEXT NOT NULL,
    source_url TEXT NOT NULL
)
"""
UNKNOWN_AUTHOR = "Wikimedia Commons"


def credits(connection):
    metadata = load_metadata()
    made = {int(path.stem) for path in OUTPUT_DIR.glob("*.webp") if path.stem.isdigit()}
    rows = []
    for player_id, commons_file in connection.execute("SELECT id, commons_file FROM players WHERE commons_file IS NOT NULL"):
        source = metadata.get(commons_file)
        if player_id in made and source and source.get("free"):
            rows.append(
                (
                    player_id,
                    source.get("artist") or UNKNOWN_AUTHOR,
                    source["license"],
                    source.get("license_url") or "",
                    source.get("page") or "",
                )
            )
    return rows


def register(database_path=DATABASE_PATH):
    connection = sqlite3.connect(database_path)
    connection.execute(TABLE)
    rows = credits(connection)
    connection.execute("DELETE FROM player_portraits")
    connection.executemany("INSERT INTO player_portraits VALUES (?, ?, ?, ?, ?)", rows)
    connection.execute(
        "INSERT OR REPLACE INTO meta VALUES ('portraits_at', ?)",
        (datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),),
    )
    connection.commit()
    connection.close()
    return len(rows)


def write():
    return {"registered": register(), "in_app_database": bundle.refresh()["portraits"]}
