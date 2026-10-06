import sqlite3
import unittest

from pipeline.config import DATABASE_PATH, LANGUAGES

GALATASARAY = 141
FENERBAHCE = 36
BESIKTAS = 114
TRABZONSPOR = 449
REAL_MADRID = 418
BARCELONA = 131
TOTTENHAM = 148
INTER = 46
PARIS_SAINT_GERMAIN = 583
MILAN = 5
ATLETICO_MADRID = 13


class KnownAnswersTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not DATABASE_PATH.exists():
            raise unittest.SkipTest("database has not been built")
        cls.connection = sqlite3.connect(DATABASE_PATH)

    @classmethod
    def tearDownClass(cls):
        cls.connection.close()

    def players_at(self, *club_ids):
        groups = [
            {row[0] for row in self.connection.execute("SELECT player_id FROM player_clubs WHERE club_id = ?", (club_id,))}
            for club_id in club_ids
        ]
        return set.intersection(*groups)

    def players_named(self, normalized):
        rows = self.connection.execute("SELECT DISTINCT player_id FROM player_names WHERE normalized = ?", (normalized,))
        return {row[0] for row in rows}

    def assert_played_for(self, normalized, *club_ids):
        matches = self.players_named(normalized) & self.players_at(*club_ids)
        self.assertTrue(matches, f"{normalized} is missing from clubs {club_ids}")

    def test_club_identifiers_point_to_expected_clubs(self):
        expected = {GALATASARAY: "galatasaray", REAL_MADRID: "real madrid", TOTTENHAM: "tottenham", MILAN: "milan"}
        for club_id, fragment in expected.items():
            name = self.connection.execute(
                "SELECT name FROM club_names WHERE club_id = ? AND language = 'en'", (club_id,)
            ).fetchone()[0]
            self.assertIn(fragment, name.lower())

    def test_players_of_all_four_istanbul_and_trabzon_clubs(self):
        everywhere = self.players_at(GALATASARAY, FENERBAHCE, BESIKTAS, TRABZONSPOR)
        self.assertTrue(self.players_named("sergen yalcin") & everywhere)
        self.assertTrue(self.players_named("burak yilmaz") & everywhere)

    def test_derby_overlap_is_deep(self):
        self.assertGreaterEqual(len(self.players_at(GALATASARAY, FENERBAHCE)), 60)

    def test_legends_come_from_wikidata(self):
        self.assert_played_for("gheorghe hagi", GALATASARAY, REAL_MADRID, BARCELONA)
        self.assert_played_for("hakan sukur", GALATASARAY, INTER)
        self.assert_played_for("alex de souza", FENERBAHCE)

    def test_recent_transfers_come_from_transfermarkt(self):
        self.assert_played_for("davinson sanchez", GALATASARAY, TOTTENHAM)
        self.assert_played_for("mauro icardi", GALATASARAY, INTER, PARIS_SAINT_GERMAIN)
        self.assert_played_for("arda guler", FENERBAHCE, REAL_MADRID)

    def test_wikidata_fills_gaps_in_transfermarkt(self):
        self.assert_played_for("mario mandzukic", ATLETICO_MADRID)

    def test_unconfirmed_current_year_spells_are_dropped(self):
        self.assertFalse(self.players_named("mohamed salah") & self.players_at(TRABZONSPOR))
        self.assertFalse(self.players_named("rafael leao") & self.players_at(GALATASARAY))

    def test_every_club_and_country_is_named_in_every_language(self):
        named_tables = (("clubs", "club_names", "club_id"), ("countries", "country_names", "country_id"))
        for parent, table, key in named_tables:
            expected = self.connection.execute(f"SELECT COUNT(*) FROM {parent}").fetchone()[0]
            for language in LANGUAGES:
                named = self.connection.execute(
                    f"SELECT COUNT(DISTINCT {key}) FROM {table} WHERE language = ? AND name <> ''", (language,)
                ).fetchone()[0]
                self.assertEqual(named, expected, (table, language))

    def test_local_legends_outrank_forgotten_squad_players(self):
        def fame(normalized):
            rows = self.connection.execute(
                "SELECT MAX(f.fame) FROM player_fame f JOIN player_names n ON n.player_id = f.player_id "
                "WHERE n.normalized = ? AND f.market = 'tr'",
                (normalized,),
            )
            return rows.fetchone()[0]

        self.assertGreater(fame("metin oktay"), fame("iulian filipescu") + 20)

    def test_search_ignores_diacritics(self):
        self.assert_played_for("hakan calhanoglu", MILAN, INTER)

    def test_players_are_not_duplicated_across_sources(self):
        duplicates = self.connection.execute(
            "SELECT COUNT(*) FROM (SELECT wikidata_id FROM players WHERE wikidata_id IS NOT NULL "
            "GROUP BY wikidata_id HAVING COUNT(*) > 1)"
        ).fetchone()[0]
        self.assertEqual(duplicates, 0)


if __name__ == "__main__":
    unittest.main()
