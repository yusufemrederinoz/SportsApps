import sqlite3
import unittest
from collections import defaultdict

from pipeline.config import DATABASE_PATH
from pipeline.grids import LEVELS, MAX_HEADER_SHARE, load_answers, load_markets

MINIMUM_GRIDS_PER_LEVEL = 1000
MINIMUM_HOME_SHARE = 0.4


class GridsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not DATABASE_PATH.exists():
            raise unittest.SkipTest("database has not been built")
        cls.connection = sqlite3.connect(DATABASE_PATH)
        cls.markets = load_markets(cls.connection)
        cls.grids = defaultdict(lambda: {"row": {}, "column": {}})
        cls.placement = {
            grid_id: (market, difficulty)
            for grid_id, market, difficulty in cls.connection.execute("SELECT id, market, difficulty FROM grids")
        }
        for grid_id, axis, position, kind, reference_id in cls.connection.execute("SELECT * FROM grid_headers"):
            cls.grids[grid_id][axis][position] = (kind, reference_id)
        cls.club_leagues = {
            ("club", club_id): league for club_id, league in cls.connection.execute("SELECT id, league_code FROM clubs")
        }

    @classmethod
    def tearDownClass(cls):
        cls.connection.close()

    def headers(self, grid_id):
        grid = self.grids[grid_id]
        return list(grid["row"].values()) + list(grid["column"].values())

    def test_every_market_and_level_has_enough_grids(self):
        for market in self.markets:
            for level in LEVELS:
                count = sum(1 for placement in self.placement.values() if placement == (market.code, level.difficulty))
                self.assertGreaterEqual(count, MINIMUM_GRIDS_PER_LEVEL, (market.code, level.difficulty))

    def test_grids_have_six_distinct_headers(self):
        for grid_id, grid in self.grids.items():
            self.assertEqual((len(grid["row"]), len(grid["column"])), (3, 3), grid_id)
            self.assertEqual(len(set(self.headers(grid_id))), 6, grid_id)

    def test_countries_share_one_axis(self):
        for grid_id, grid in self.grids.items():
            axes = {axis for axis in ("row", "column") if any(kind == "country" for kind, _ in grid[axis].values())}
            self.assertLessEqual(len(axes), 1, grid_id)

    def test_home_clubs_appear_in_a_large_share_of_grids(self):
        for market in self.markets:
            if not market.home_league:
                continue
            for level in LEVELS:
                grid_ids = [grid_id for grid_id, placement in self.placement.items() if placement == (market.code, level.difficulty)]
                with_home = sum(
                    1 for grid_id in grid_ids if market.home_league in {self.club_leagues.get(header) for header in self.headers(grid_id)}
                )
                self.assertGreaterEqual(with_home / len(grid_ids), MINIMUM_HOME_SHARE, (market.code, level.difficulty))

    def test_no_header_dominates_a_level(self):
        for market in self.markets:
            for level in LEVELS:
                grid_ids = [grid_id for grid_id, placement in self.placement.items() if placement == (market.code, level.difficulty)]
                usage = defaultdict(int)
                for grid_id in grid_ids:
                    for header in self.headers(grid_id):
                        usage[header] += 1
                self.assertLessEqual(max(usage.values()) / len(grid_ids), MAX_HEADER_SHARE + 0.01, (market.code, level.difficulty))

    def test_every_cell_has_enough_famous_answers(self):
        for market in self.markets:
            for level in LEVELS:
                answers, _ = load_answers(self.connection, market, level)
                for grid_id, placement in self.placement.items():
                    if placement != (market.code, level.difficulty):
                        continue
                    grid = self.grids[grid_id]
                    for row in grid["row"].values():
                        for column in grid["column"].values():
                            shared = len(answers[row] & answers[column])
                            self.assertGreaterEqual(shared, level.answers, (grid_id, row, column))

    def test_grids_are_unique_within_a_market(self):
        keys = {
            (self.placement[grid_id][0], frozenset((frozenset(grid["row"].values()), frozenset(grid["column"].values()))))
            for grid_id, grid in self.grids.items()
        }
        self.assertEqual(len(keys), len(self.grids))


if __name__ == "__main__":
    unittest.main()
