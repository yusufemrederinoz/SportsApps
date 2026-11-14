import unittest

from pipeline.merge import represented_country

COUNTRIES = {
    "Q43": {"names": {"en": "Turkey"}},
    "Q183": {"names": {"en": "Germany"}},
    "Q142": {"names": {"en": "France"}},
    "Q929": {"names": {"en": "Central African Republic"}},
    "Q17054": {"names": {"en": "Martinique"}},
}
ALIASES = {"Q999": "Q43"}


def team(label, country, matches):
    return (label, country, matches)


class RepresentedCountryTest(unittest.TestCase):
    def test_picks_the_only_senior_team_with_enough_matches(self):
        caps = [team("Turkey national football team", "Q43", 10)]
        self.assertEqual(represented_country(caps, COUNTRIES, ALIASES), "Q43")

    def test_ignores_players_with_few_matches(self):
        caps = [team("Turkey national football team", "Q43", 2)]
        self.assertIsNone(represented_country(caps, COUNTRIES, ALIASES))

    def test_ignores_youth_reserve_and_regional_teams(self):
        caps = [
            team("Germany national under-21 football team", "Q183", 20),
            team("Germany national under-19 football team", "Q183", 9),
            team("Germany B national football team", "Q183", 4),
            team("Basque Country regional football team", "Q142", 12),
            team("Turkey national football team", "Q43", 3),
        ]
        self.assertEqual(represented_country(caps, COUNTRIES, ALIASES, "Q183"), "Q43")

    def test_needs_a_clear_lead_over_the_other_senior_team(self):
        close = [team("Turkey national football team", "Q43", 4), team("Germany national football team", "Q183", 3)]
        clear = [team("Turkey national football team", "Q43", 10), team("Germany national football team", "Q183", 4)]
        self.assertIsNone(represented_country(close, COUNTRIES, ALIASES))
        self.assertEqual(represented_country(clear, COUNTRIES, ALIASES), "Q43")

    def test_adds_up_several_rows_of_the_same_country_and_follows_aliases(self):
        caps = [team("Turkey national football team", "Q43", 2), team("Turkey national football team", "Q999", 2)]
        self.assertEqual(represented_country(caps, COUNTRIES, ALIASES), "Q43")

    def test_skips_countries_that_are_not_in_the_dataset(self):
        caps = [team("Narnia national football team", "Q1", 50)]
        self.assertIsNone(represented_country(caps, COUNTRIES, ALIASES))
        self.assertIsNone(represented_country([], COUNTRIES, ALIASES))

    def test_keeps_the_current_country_when_the_player_played_for_it(self):
        switched = [
            team("France national football team", "Q142", 5),
            team("Central African Republic national football team", "Q929", 1),
        ]
        territory = [team("Martinique national football team", "Q142", 5)]
        self.assertIsNone(represented_country(switched, COUNTRIES, ALIASES, "Q929"))
        self.assertIsNone(represented_country(territory, COUNTRIES, ALIASES, "Q17054"))

    def test_stays_undecided_when_another_senior_team_has_no_match_count(self):
        caps = [
            team("France national football team", "Q142", 5),
            team("Central African Republic national football team", "Q929", None),
        ]
        self.assertIsNone(represented_country(caps, COUNTRIES, ALIASES))
        known = caps + [team("France national football team", "Q142", None)]
        self.assertIsNone(represented_country(known, COUNTRIES, ALIASES))
        self.assertEqual(represented_country(caps[:1] + known[2:], COUNTRIES, ALIASES), "Q142")


if __name__ == "__main__":
    unittest.main()
