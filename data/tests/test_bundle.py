import json
import sqlite3
import unittest
from pathlib import Path

from pipeline.config import APP_DATABASE_PATH, APP_VERSION_PATH, LANGUAGES
from pipeline.text import normalize

FIXTURE_PATH = Path(__file__).resolve().parents[2] / "packages" / "game-core" / "tests" / "fixtures" / "normalized-names.json"


class BundleTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not APP_DATABASE_PATH.exists():
            raise unittest.SkipTest("app database has not been built")
        cls.connection = sqlite3.connect(APP_DATABASE_PATH)

    @classmethod
    def tearDownClass(cls):
        cls.connection.close()

    def scalar(self, query, *parameters):
        return self.connection.execute(query, parameters).fetchone()[0]

    def search(self, text):
        query = " ".join(f'"{token}"*' for token in normalize(text).split())
        rows = self.connection.execute(
            "SELECT p.name FROM player_search s JOIN players p ON p.id = s.player_id "
            "LEFT JOIN player_fame f ON f.player_id = p.id AND f.market = 'tr' "
            "WHERE player_search MATCH ? GROUP BY p.id ORDER BY COALESCE(f.fame, 0) DESC LIMIT 5",
            (query,),
        )
        return [normalize(row[0]) for row in rows]

    def test_version_file_matches_database(self):
        version = json.loads(APP_VERSION_PATH.read_text(encoding="utf-8"))
        self.assertEqual(str(version["schemaVersion"]), self.scalar("SELECT value FROM meta WHERE key = 'schema_version'"))

    def test_search_finds_players_by_partial_name(self):
        self.assertEqual(self.search("calhan")[0], "hakan calhanoglu")
        self.assertEqual(self.search("Şükür")[0], "hakan sukur")
        self.assertIn("mauro icardi", self.search("mau ica"))

    def test_every_grid_header_has_a_name_in_every_language(self):
        for kind, table, key in (("club", "club_names", "club_id"), ("country", "country_names", "country_id")):
            for language in LANGUAGES:
                missing = self.scalar(
                    f"SELECT COUNT(*) FROM grid_headers h WHERE h.kind = ? AND NOT EXISTS "
                    f"(SELECT 1 FROM {table} n WHERE n.{key} = h.reference_id AND n.language = ?)",
                    kind,
                    language,
                )
                self.assertEqual(missing, 0, (kind, language))

    def test_every_player_has_a_club(self):
        orphans = self.scalar("SELECT COUNT(*) FROM players WHERE id NOT IN (SELECT player_id FROM player_clubs)")
        self.assertEqual(orphans, 0)

    def test_names_normalize_like_the_shared_fixture(self):
        for name, expected in json.loads(FIXTURE_PATH.read_text(encoding="utf-8")):
            self.assertEqual(normalize(name), expected, name)


if __name__ == "__main__":
    unittest.main()
