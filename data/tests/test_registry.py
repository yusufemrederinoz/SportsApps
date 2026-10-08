import sqlite3
import tempfile
import unittest
from pathlib import Path

from pipeline.config import APP_DATABASE_PATH, PLAYER_REGISTRY_PATH, REASSIGNED_ID_OFFSET, TRANSFERMARKT_ONLY_ID_OFFSET
from pipeline.registry import PlayerRegistry


class PlayerRegistryTest(unittest.TestCase):
    def test_new_players_get_their_natural_ids(self):
        registry = PlayerRegistry()
        self.assertEqual(
            registry.assign([(28003, "Q615"), (None, "Q624"), (77, None)]),
            [615, 624, TRANSFERMARKT_ONLY_ID_OFFSET + 77],
        )

    def test_known_players_keep_their_ids_in_any_order(self):
        registry = PlayerRegistry()
        first = registry.assign([(28003, "Q615"), (None, "Q624"), (77, None)])
        self.assertEqual(registry.assign([(77, None), (None, "Q624"), (28003, "Q615")]), list(reversed(first)))

    def test_a_player_keeps_the_id_after_gaining_a_wikidata_entry(self):
        registry = PlayerRegistry()
        [before] = registry.assign([(77, None)])
        self.assertEqual(registry.assign([(77, "Q900")]), [before])
        self.assertEqual(registry.assign([(None, "Q900")]), [before])

    def test_a_player_keeps_the_id_after_gaining_a_transfermarkt_entry(self):
        registry = PlayerRegistry()
        registry.assign([(None, "Q624")])
        self.assertEqual(registry.assign([(55, "Q624")]), [624])
        self.assertEqual(registry.assign([(55, None)]), [624])

    def test_merged_players_keep_the_wikidata_id_and_retire_the_other(self):
        registry = PlayerRegistry()
        registry.assign([(77, None), (None, "Q900")])
        self.assertEqual(registry.assign([(77, "Q900")]), [900])
        self.assertEqual(registry.sources[TRANSFERMARKT_ONLY_ID_OFFSET + 77], (None, None))
        self.assertEqual(registry.assign([(77, "Q900"), (78, None)]), [900, TRANSFERMARKT_ONLY_ID_OFFSET + 78])

    def test_a_split_leaves_the_id_with_the_wikidata_entry(self):
        registry = PlayerRegistry()
        registry.assign([(77, "Q900")])
        self.assertEqual(registry.assign([(77, None), (None, "Q900")]), [TRANSFERMARKT_ONLY_ID_OFFSET + 77, 900])

    def test_a_relinked_player_does_not_take_over_another_id(self):
        registry = PlayerRegistry()
        registry.assign([(77, "Q900")])
        self.assertEqual(registry.assign([(77, "Q901"), (None, "Q900")]), [901, 900])

    def test_a_retired_id_is_never_given_to_someone_else(self):
        registry = PlayerRegistry()
        [original] = registry.assign([(77, None)])
        registry.assign([(77, "Q900")])
        [split, other] = registry.assign([(77, None), (None, "Q900")])
        self.assertEqual(other, original)
        self.assertEqual(split, REASSIGNED_ID_OFFSET + 1)
        self.assertEqual(registry.assign([(78, "Q900"), (77, None)]), [original, split])

    def test_absent_players_return_with_the_same_id(self):
        registry = PlayerRegistry()
        [before] = registry.assign([(77, None)])
        registry.assign([(78, None)])
        self.assertEqual(registry.assign([(77, None)]), [before])

    def test_the_file_round_trips(self):
        registry = PlayerRegistry()
        registry.assign([(28003, "Q615"), (None, "Q624"), (77, None)])
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "nested" / "player_ids.csv"
            registry.save(path)
            self.assertEqual(PlayerRegistry.load(path).sources, registry.sources)
            self.assertEqual(path.read_text(encoding="utf-8").splitlines()[:2], ["id,transfermarkt_id,wikidata_id", "615,28003,Q615"])
        self.assertEqual(PlayerRegistry.load(Path(folder) / "missing.csv").sources, {})


class RegisteredPlayersTest(unittest.TestCase):
    def test_every_bundled_player_is_registered(self):
        if not APP_DATABASE_PATH.exists():
            raise unittest.SkipTest("app database has not been built")
        connection = sqlite3.connect(APP_DATABASE_PATH)
        try:
            bundled = {row[0] for row in connection.execute("SELECT id FROM players")}
        finally:
            connection.close()
        self.assertEqual(bundled - set(PlayerRegistry.load(PLAYER_REGISTRY_PATH).sources), set())

    def test_no_source_points_at_two_players(self):
        registry = PlayerRegistry.load(PLAYER_REGISTRY_PATH)
        for position in (0, 1):
            sources = [entry[position] for entry in registry.sources.values() if entry[position]]
            self.assertEqual(len(sources), len(set(sources)))


if __name__ == "__main__":
    unittest.main()
