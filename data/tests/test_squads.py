import unittest
from collections import defaultdict
from unittest import mock

from pipeline import merge, squads
from pipeline.merge import CURRENT_YEAR, SEASON_YEAR, Spell

NESTED = """
== History ==
{{Fs player|no=9|nat=TUR|pos=FW|name=[[Old Legend]]}}
== Players ==
=== First-team squad ===
{{Fs start}}
{{Fs player|no=1|nat=TUR|pos=GK|name=[[Uğurcan Çakır]]}}
{{Fs player|no=6|nat=FRA|pos=MF|name=[[Lesley Ugochukwu]]|other=[[Captain (association football)|captain]]}}
{{fs player |no=7 |nat=POR |pos=FW |name=[[Rafael Leão|Leão]]}}
{{Fs end}}
=== Out on loan ===
{{Fs player|no=|nat=TUR|pos=DF|name=[[Loaned_Defender (footballer)#Career|Defender]]}}
=== Reserves and academy ===
{{Fs player|no=40|nat=TUR|pos=MF|name=[[Academy Kid]]}}
=== Former players ===
{{Fs player|no=10|nat=ROU|pos=MF|name=[[Gheorghe Hagi]]}}
== Club officials ==
{{Fs player|no=|nat=TUR|pos=GK|name=[[Not A Player]]}}
"""

FLAT = """
==Current squad==
{{Football squad player|no=1|nat=ESP|pos=GK|name=[[First Keeper]]}}
{{Football squad player|no=2|nat=ESP|pos=DF|name=Unlinked Player}}
{{Football squad player2|no=3|nat=ESP|pos=DF|name=[[Second Defender]]}}
==Out on loan==
{{Football squad player|no=|nat=ESP|pos=FW|name=[[Loaned Forward]]}}
==Retired numbers==
{{Football squad player|no=12|nat=ESP|pos=FW|name=[[Retired Number]]}}
"""


class SquadTitlesTest(unittest.TestCase):
    def test_reads_the_first_team_and_loans_but_not_other_teams(self):
        self.assertEqual(
            squads.squad_titles(NESTED),
            ["Uğurcan Çakır", "Lesley Ugochukwu", "Rafael Leão", "Loaned Defender (footballer)"],
        )

    def test_reads_a_top_level_squad_section_with_its_loan_list(self):
        self.assertEqual(squads.squad_titles(FLAT), ["First Keeper", "Second Defender", "Loaned Forward"])

    def test_counts_players_without_an_article_towards_the_squad_size(self):
        self.assertEqual(squads.squad_size(FLAT), 4)
        self.assertEqual(squads.squad_size(NESTED), 4)

    def test_finds_nothing_without_a_squad_section(self):
        self.assertEqual(squads.squad_titles("== History ==\n{{Fs player|name=[[Old Legend]]}}"), [])


class SquadSpellsTest(unittest.TestCase):
    def test_adds_the_club_to_known_players_and_to_footballers_only(self):
        spells = defaultdict(dict)
        spells["Q1"][10] = Spell()
        spells["Q1"][10].add("tm", 2023, 2025)
        answer = [{"player": "http://www.wikidata.org/entity/Q2"}]
        with mock.patch.object(merge.wikidata, "footballers", return_value=answer) as lookup:
            accepted = merge.add_squad_spells(spells, {20: ["Q1", "Q2", "Q3"]}, refresh=False)

        self.assertEqual(lookup.call_args.args[0], {"Q2", "Q3"})
        self.assertEqual(accepted, {"Q2"})
        self.assertEqual(sorted(spells), ["Q1", "Q2"])
        self.assertEqual((spells["Q1"][20].first_year, spells["Q1"][20].last_year), (SEASON_YEAR, CURRENT_YEAR))
        self.assertEqual(spells["Q1"][20].sources, {"wp"})
        self.assertEqual(spells["Q1"][10].sources, {"tm"})

    def test_keeps_the_earlier_start_of_a_player_already_at_the_club(self):
        spells = defaultdict(dict)
        spells["Q1"][10] = Spell()
        spells["Q1"][10].add("tm", 2019, 2025)
        merge.add_squad_spells(spells, {10: ["Q1"]}, refresh=False)

        self.assertEqual((spells["Q1"][10].first_year, spells["Q1"][10].last_year), (2019, CURRENT_YEAR))
        self.assertEqual(spells["Q1"][10].sources, {"tm", "wp"})


class RumorTest(unittest.TestCase):
    def spell(self, *sources):
        spell = Spell()
        for source in sources:
            spell.add(source, CURRENT_YEAR)
        return spell

    def test_a_current_year_spell_known_only_to_wikidata_is_a_rumor(self):
        self.assertTrue(self.spell("wd").is_rumor)

    def test_a_current_squad_or_a_transfer_record_confirms_it(self):
        self.assertFalse(self.spell("wd", "wp").is_rumor)
        self.assertFalse(self.spell("wd", "tm").is_rumor)
        self.assertFalse(self.spell("wp").is_rumor)


if __name__ == "__main__":
    unittest.main()
