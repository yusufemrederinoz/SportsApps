import csv
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from pipeline import merge

COLUMNS = ["player_id", "season_name", "team_id", "nb_on_pitch", "goals", "assists"]


def write_rows(directory, rows):
    path = Path(directory) / "player_performances.csv"
    with open(path, "w", encoding="utf-8", newline="") as target:
        writer = csv.writer(target)
        writer.writerow(COLUMNS)
        writer.writerows(rows)
    return path


class PerformanceSeasonsTest(unittest.TestCase):
    def tearDown(self):
        merge.performance_seasons.cache_clear()

    def seasons(self, rows):
        merge.performance_seasons.cache_clear()
        with tempfile.TemporaryDirectory() as directory:
            path = write_rows(directory, rows)
            with mock.patch.object(merge.stats, "download", return_value=path):
                return merge.performance_seasons(False)

    def test_spans_the_seasons_a_player_took_the_pitch_for_a_club(self):
        seasons = self.seasons(
            [
                [37944, "06/07", 114, 30, 12, 3],
                [37944, "09/10", 114, 25, 8, 2],
                [37944, "07/08", 114, 0, 0, 0],
                [37944, "2012", 620, 10, 2, 1],
            ]
        )
        self.assertEqual(seasons[(37944, 114)], [2006, 2010, 55])
        self.assertEqual(seasons[(37944, 620)], [2012, 2012, 10])

    def test_skips_seasons_without_matches(self):
        seasons = self.seasons([[1, "10/11", 5, 0, 0, 0]])
        self.assertEqual(seasons, {})

    def test_adds_spells_only_for_known_clubs_and_players(self):
        rows = [[37944, "06/07", 114, 30, 12, 3], [37944, "06/07", 999, 4, 0, 0], [5, "06/07", 114, 9, 1, 0]]
        merge.performance_seasons.cache_clear()
        with tempfile.TemporaryDirectory() as directory:
            path = write_rows(directory, rows)
            empty = mock.MagicMock(return_value=iter(()))
            with mock.patch.object(merge.stats, "download", return_value=path), mock.patch.object(
                merge.transfermarkt, "rows", empty
            ):
                players = {37944: {"current_club_id": ""}}
                spells = merge.collect_transfermarkt_spells({114: {}}, players, False)
        self.assertEqual(set(spells), {37944})
        spell = spells[37944][114]
        self.assertEqual((spell.first_year, spell.last_year, spell.appearances), (2006, 2007, 30))
        self.assertIn("tm", spell.sources)


if __name__ == "__main__":
    unittest.main()
