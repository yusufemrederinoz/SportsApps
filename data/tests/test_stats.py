import sqlite3
import unittest

from pipeline.config import APP_DATABASE_PATH, DATABASE_PATH
from pipeline.stats import covers_career, season_year, whole


class StatHelpersTest(unittest.TestCase):
    def test_reads_split_and_calendar_seasons(self):
        self.assertEqual(season_year("03/04"), 2003)
        self.assertEqual(season_year("98/99"), 1998)
        self.assertEqual(season_year("25/26"), 2025)
        self.assertEqual(season_year("2018"), 2018)
        self.assertIsNone(season_year(""))
        self.assertIsNone(season_year("n/a"))

    def test_reads_numbers_written_as_decimals_or_left_blank(self):
        self.assertEqual(whole("12.0"), 12)
        self.assertEqual(whole("7"), 7)
        self.assertEqual(whole(""), 0)
        self.assertEqual(whole(None), 0)
        self.assertEqual(whole("-"), 0)

    def test_trusts_a_career_only_when_the_record_starts_early_enough(self):
        self.assertTrue(covers_career(2003, 1987))
        self.assertTrue(covers_career(1998, 1978))
        self.assertFalse(covers_career(2004, 1977))
        self.assertFalse(covers_career(None, 1987))
        self.assertFalse(covers_career(2003, None))


class StoredStatsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not DATABASE_PATH.exists() or not APP_DATABASE_PATH.exists():
            raise unittest.SkipTest("databases have not been built")
        cls.full = sqlite3.connect(DATABASE_PATH)
        cls.app = sqlite3.connect(APP_DATABASE_PATH)
        if not cls.full.execute("SELECT 1 FROM sqlite_master WHERE name = 'player_stats'").fetchone():
            raise unittest.SkipTest("statistics have not been imported")

    @classmethod
    def tearDownClass(cls):
        cls.full.close()
        cls.app.close()

    def career(self, name):
        return self.full.execute(
            "SELECT s.source, s.appearances, s.goals, s.assists, s.is_complete FROM players p "
            "JOIN player_stats s ON s.player_id = p.id JOIN player_fame f ON f.player_id = p.id AND f.market = 'tr' "
            "WHERE p.name = ? ORDER BY f.fame DESC LIMIT 1",
            (name,),
        ).fetchone()

    def test_modern_players_have_whole_career_totals_with_assists(self):
        source, appearances, goals, assists, complete = self.career("Lionel Messi")
        self.assertEqual(source, "performances")
        self.assertGreater(appearances, 900)
        self.assertGreater(goals, 700)
        self.assertGreater(assists, 300)
        self.assertEqual(complete, 1)

    def test_older_legends_fall_back_to_goals_without_assists(self):
        source, appearances, goals, assists, _ = self.career("Gheorghe Hagi")
        self.assertEqual(source, "wikidata")
        self.assertGreater(goals, 200)
        self.assertIsNone(assists)

    def test_most_answerable_players_have_statistics(self):
        total, covered = self.full.execute(
            "SELECT COUNT(*), SUM(f.player_id IN (SELECT player_id FROM player_stats)) "
            "FROM player_fame f WHERE f.market = 'tr' AND f.fame >= 32"
        ).fetchone()
        self.assertGreater(covered / total, 0.9)

    def test_club_totals_never_exceed_the_career(self):
        broken = self.full.execute(
            "SELECT COUNT(*) FROM player_club_stats c JOIN player_stats s ON s.player_id = c.player_id "
            "WHERE c.goals > s.goals OR c.appearances > s.appearances"
        ).fetchone()[0]
        self.assertEqual(broken, 0)

    def test_app_database_carries_the_statistics_of_its_players(self):
        app_rows = self.app.execute("SELECT COUNT(*) FROM player_stats").fetchone()[0]
        orphans = self.app.execute(
            "SELECT COUNT(*) FROM player_stats WHERE player_id NOT IN (SELECT id FROM players)"
        ).fetchone()[0]
        self.assertGreater(app_rows, 20000)
        self.assertEqual(orphans, 0)
