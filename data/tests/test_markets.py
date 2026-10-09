import bz2
import tempfile
import unittest
from pathlib import Path

from pipeline import dumps, fame, merge
from pipeline.grids import Level, select_pool


class SharedFameTest(unittest.TestCase):
    def test_a_rank_in_each_language_counts_as_the_same_rank_in_the_reference(self):
        english = {1: 900_000, 2: 5_000}
        german = {1: 40_000, 3: 30_000}
        shares = fame.shared_share([english, german], [100_000, 10_000, 0])
        self.assertAlmostEqual(shares[1], fame.local_share(100_000))
        self.assertAlmostEqual(shares[2], fame.local_share(10_000) / 2)
        self.assertAlmostEqual(shares[3], fame.local_share(10_000) / 2)

    def test_unread_players_get_no_share(self):
        shares = fame.shared_share([{1: 0, 2: 10}], [100_000])
        self.assertNotIn(1, shares)
        self.assertAlmostEqual(shares[2], fame.local_share(100_000))

    def test_ranks_beyond_the_reference_count_as_unread(self):
        shares = fame.shared_share([{1: 30, 2: 20}], [100_000])
        self.assertEqual(shares[2], 0.0)

    def test_matched_scores_follow_the_reference_distribution(self):
        scores = fame.matched({7: 61.2, 8: 80.5, 9: 61.2, 10: 3.0}, [100, 70, 40])
        self.assertEqual(scores, {8: 100, 7: 70, 9: 40, 10: 0})


class MarketNamesTest(unittest.TestCase):
    def test_a_market_without_fame_languages_uses_its_own_language(self):
        self.assertEqual(merge.fame_languages({"language": "tr", "fame_languages": ""}), ["tr"])
        self.assertEqual(merge.fame_languages({"language": "en", "fame_languages": "en de"}), ["en", "de"])

    def test_long_official_club_names_fall_back_to_the_default_name(self):
        names = merge.compact_names(
            {
                "en": "FC Bayern Munich",
                "tr": "Fußball-Club Bayern München",
                "de": "FC Bayern München",
                "it": "Fußball-Club Bayern München",
            }
        )
        self.assertEqual(names["de"], "FC Bayern München")
        self.assertEqual(names["it"], "FC Bayern Munich")
        self.assertEqual(names["tr"], "Fußball-Club Bayern München")


class GridPoolTest(unittest.TestCase):
    def setUp(self):
        self.level = Level(difficulty=1, fame=50, answers=3, home_clubs=2, foreign_clubs=3, countries=1, target=10)
        self.answers = {("club", club_id): set(range(20 - club_id)) for club_id in range(1, 9)}
        self.answers[("country", 1)] = {1}

    def test_a_market_without_a_home_league_fills_the_home_places_with_other_clubs(self):
        pool = select_pool(self.answers, set(), self.level)
        self.assertEqual([header for header in pool if header[0] == "club"], [("club", club_id) for club_id in range(1, 6)])

    def test_home_clubs_keep_their_places(self):
        home = {("club", 6), ("club", 7), ("club", 8)}
        pool = select_pool(self.answers, home, self.level)
        self.assertEqual(pool[:2], [("club", 6), ("club", 7)])
        self.assertEqual(pool[2:5], [("club", 1), ("club", 2), ("club", 3)])


class MonthlyViewsTest(unittest.TestCase):
    def test_views_are_summed_over_access_methods_for_the_wanted_titles(self):
        rows = [
            "de.wikipedia Mats_Hummels 1 desktop 40 A1",
            "de.wikipedia Mats_Hummels 1 mobile-web 60 A1",
            "de.wikipedia Someone_Else 2 desktop 999 A1",
            "en.wikipedia Mats_Hummels 3 desktop 7 A1",
            "en.wikivoyage Mats_Hummels 4 desktop 500 A1",
            "fr.wikipedia Mats_Hummels 5 desktop 3 A1",
        ]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "views.bz2"
            with bz2.open(path, "wt", encoding="utf-8") as target:
                target.write("\n".join(rows) + "\n")
            views = dumps.monthly_views(path, {"de": ["Mats Hummels", "Nobody"], "en": ["Mats Hummels"]})
        self.assertEqual(views, {"de": {"Mats Hummels": 100, "Nobody": 0}, "en": {"Mats Hummels": 7}})


if __name__ == "__main__":
    unittest.main()
