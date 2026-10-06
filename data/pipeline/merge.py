import csv
import datetime
import urllib.parse
from collections import Counter, defaultdict
from dataclasses import dataclass, field

from . import fame, transfermarkt, wikidata, wikipedia
from .config import DEFAULT_LANGUAGE, LANGUAGES, OVERRIDES_DIR, TRANSFERMARKT_ONLY_ID_OFFSET, TRANSFERMARKT_POSITIONS
from .text import normalize
from .wikidata import FEMALE, NAME_FALLBACK_LANGUAGES, NEUTRAL_LANGUAGE, entity_id, entity_number

NAME_LANGUAGES = tuple(dict.fromkeys((DEFAULT_LANGUAGE, NEUTRAL_LANGUAGE, *LANGUAGES, *NAME_FALLBACK_LANGUAGES)))

CURRENT_YEAR = datetime.date.today().year


@dataclass
class Spell:
    starts: list = field(default_factory=list)
    ends: list = field(default_factory=list)
    appearances: int = 0
    sources: set = field(default_factory=set)

    def add(self, source, start=None, end=None):
        self.sources.add(source)
        if start is not None:
            self.starts.append(start)
        if end is not None:
            self.ends.append(end)

    @property
    def first_year(self):
        return min(self.starts) if self.starts else None

    @property
    def last_year(self):
        return max(self.ends) if self.ends else None

    @property
    def is_confirmed(self):
        return "tm" in self.sources or bool(self.starts or self.ends)

    @property
    def is_rumor(self):
        return self.sources == {"wd"} and self.first_year is not None and self.first_year >= CURRENT_YEAR


def read_override(name):
    path = OVERRIDES_DIR / name
    if not path.exists():
        return []
    with open(path, encoding="utf-8", newline="") as source:
        return list(csv.DictReader(source))


def year_of(value):
    if not value or not value[:4].isdigit():
        return None
    year = int(value[:4])
    return year if 1850 <= year <= CURRENT_YEAR else None


def integer_or_none(value):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def position_from_labels(labels):
    for label in labels:
        text = label.lower()
        if "goalkeeper" in text:
            return "GK"
        if "midfield" in text:
            return "MF"
        if any(word in text for word in ("defender", "back", "sweeper", "libero")):
            return "DF"
        if any(word in text for word in ("forward", "striker", "wing")):
            return "FW"
    return None


def localized_names(labels, fallback):
    default = labels.get(DEFAULT_LANGUAGE) or labels.get(NEUTRAL_LANGUAGE) or fallback
    return {language: labels.get(language) or default for language in LANGUAGES}


def display_name(variants):
    key = normalize(variants[0])
    spellings = [variant for variant in variants if normalize(variant) == key]
    name = max(spellings, key=lambda variant: sum(ord(char) > 127 for char in variant))
    return name.title() if name == name.lower() else name


def resolve_clubs(leagues, refresh):
    clubs = {}
    for row in transfermarkt.rows("clubs", refresh):
        if row["domestic_competition_id"] in leagues:
            club_id = int(row["club_id"])
            clubs[club_id] = {
                "id": club_id,
                "league": row["domestic_competition_id"],
                "transfermarkt_name": row["name"],
                "candidates": set(),
                "override": None,
            }

    for row in wikidata.transfermarkt_team_ids(refresh):
        if row["transfermarkt"].isdigit() and int(row["transfermarkt"]) in clubs:
            clubs[int(row["transfermarkt"])]["candidates"].add(entity_id(row["club"]))
    for row in read_override("club_wikidata_ids.csv"):
        club = clubs.get(int(row["transfermarkt_id"]))
        if club:
            club["candidates"].add(row["wikidata_id"])
            club["override"] = row["wikidata_id"]

    owners = defaultdict(set)
    for club in clubs.values():
        for candidate in club["candidates"]:
            owners[candidate].add(club["id"])

    parent_owners = defaultdict(set)
    for row in wikidata.parents(set(owners), refresh):
        parent = entity_id(row["parent"])
        if parent not in owners:
            parent_owners[parent] |= owners[entity_id(row["club"])]
    for parent, owner_ids in parent_owners.items():
        if len(owner_ids) == 1:
            clubs[next(iter(owner_ids))]["candidates"].add(parent)
    for row in read_override("club_wikidata_aliases.csv"):
        for owner_id in owners.get(row["wikidata_id"], ()):
            clubs[owner_id]["candidates"].add(row["alias_id"])

    club_by_wikidata_id = {}
    for club in clubs.values():
        for candidate in club["candidates"]:
            club_by_wikidata_id.setdefault(candidate, club["id"])

    membership_rows = wikidata.memberships(set(club_by_wikidata_id), refresh) if club_by_wikidata_id else []
    members = defaultdict(set)
    for row in membership_rows:
        members[entity_id(row["club"])].add(entity_id(row["player"]))

    for club in clubs.values():
        ranked = sorted(club["candidates"], key=lambda item: (-len(members[item]), entity_number(item)))
        club["wikidata_id"] = club["override"] or (ranked[0] if ranked else None)
        club["aliases"] = [(item, len(members[item])) for item in ranked if item != club["wikidata_id"]]

    canonical_ids = {club["wikidata_id"] for club in clubs.values() if club["wikidata_id"]}
    names = defaultdict(dict)
    for row in wikidata.labels(canonical_ids, refresh) if canonical_ids else []:
        names[entity_id(row["item"])][row["language"]] = row["label"]
    for club in clubs.values():
        club["names"] = localized_names(names.get(club["wikidata_id"], {}), club["transfermarkt_name"])

    return clubs, club_by_wikidata_id, membership_rows


def load_countries(refresh):
    extras = {row["wikidata_id"]: row for row in read_override("countries.csv")}
    aliases = {row["alias_id"]: row["wikidata_id"] for row in read_override("country_aliases.csv")}
    countries = {}
    labels = defaultdict(dict)
    for row in wikidata.countries(set(extras), refresh):
        identifier = entity_id(row["country"])
        country = countries.setdefault(identifier, {"id": entity_number(identifier), "wikidata_id": identifier, "code": None})
        country["code"] = row.get("code") or country["code"]
        labels[identifier][row["language"]] = row["label"]
    for row in read_override("country_display_names.csv"):
        labels[row["wikidata_id"]][row["language"]] = row["name"]
    for identifier, extra in extras.items():
        if identifier in countries:
            countries[identifier]["code"] = extra["code"] or countries[identifier]["code"]
    for alias in aliases:
        countries.pop(alias, None)
    by_name = {}
    for identifier in sorted(countries, key=entity_number):
        countries[identifier]["names"] = localized_names(labels[identifier], identifier)
        by_name.setdefault(normalize(countries[identifier]["names"][DEFAULT_LANGUAGE]), identifier)
    for row in read_override("transfermarkt_countries.csv"):
        if row["wikidata_id"] in countries:
            by_name[normalize(row["name"])] = row["wikidata_id"]
    return countries, by_name, aliases


def collect_transfermarkt_spells(clubs, players, refresh):
    spells = defaultdict(dict)

    def spell(player_id, club_id):
        return spells[player_id].setdefault(club_id, Spell())

    seasons = {}
    for row in transfermarkt.rows("appearances", refresh):
        club_id = int(row["player_club_id"])
        if club_id not in clubs:
            continue
        key = (int(row["player_id"]), club_id)
        year = year_of(row["date"])
        entry = seasons.setdefault(key, [year, year, 0])
        if year is not None:
            entry[0] = year if entry[0] is None else min(entry[0], year)
            entry[1] = year if entry[1] is None else max(entry[1], year)
        entry[2] += 1
    for (player_id, club_id), (first, last, count) in seasons.items():
        if player_id in players:
            target = spell(player_id, club_id)
            target.add("tm", first, last)
            target.appearances = count

    for row in transfermarkt.rows("transfers", refresh):
        player_id = int(row["player_id"])
        if player_id not in players:
            continue
        year = year_of(row["transfer_date"])
        if row["to_club_id"].isdigit() and int(row["to_club_id"]) in clubs:
            spell(player_id, int(row["to_club_id"])).add("tm", start=year)
        if row["from_club_id"].isdigit() and int(row["from_club_id"]) in clubs:
            spell(player_id, int(row["from_club_id"])).add("tm", end=year)

    for player_id, row in players.items():
        if row["current_club_id"].isdigit() and int(row["current_club_id"]) in clubs:
            spell(player_id, int(row["current_club_id"])).add("tm")

    return spells


def collect_wikidata_spells(membership_rows, club_by_wikidata_id):
    spells = defaultdict(dict)
    for row in membership_rows:
        club_id = club_by_wikidata_id[entity_id(row["club"])]
        target = spells[entity_id(row["player"])].setdefault(club_id, Spell())
        target.add("wd", year_of(row.get("start")), year_of(row.get("end")))
    return spells


def link_by_identifier(transfermarkt_players, scope_ids, refresh):
    candidates = defaultdict(set)
    for row in wikidata.transfermarkt_player_ids(refresh):
        if row["transfermarkt"].isdigit() and int(row["transfermarkt"]) in transfermarkt_players:
            candidates[int(row["transfermarkt"])].add(entity_id(row["player"]))
    wikidata_by_transfermarkt = {}
    transfermarkt_by_wikidata = {}
    for player_id in sorted(candidates):
        ranked = sorted(candidates[player_id], key=lambda item: (item not in scope_ids, entity_number(item)))
        for candidate in ranked:
            if candidate not in transfermarkt_by_wikidata:
                wikidata_by_transfermarkt[player_id] = candidate
                transfermarkt_by_wikidata[candidate] = player_id
                break
    return wikidata_by_transfermarkt, transfermarkt_by_wikidata


def load_wikidata_players(scopes, refresh):
    attributes = wikidata.player_attributes(scopes, refresh)
    players = {}

    def record(row):
        return players.setdefault(
            entity_id(row["player"]),
            {
                "labels": {},
                "aliases": [],
                "birth": None,
                "sitelinks": None,
                "image": None,
                "transfermarkt": None,
                "female": False,
                "articles": {},
                "sport_countries": [],
                "citizenships": [],
                "positions": [],
            },
        )

    for row in attributes["core"]:
        target = record(row)
        target["sitelinks"] = target["sitelinks"] or integer_or_none(row.get("sitelinks"))
        target["birth"] = target["birth"] or (row["birth"][:10] if row.get("birth", "")[:4].isdigit() else None)
        if row.get("image") and not target["image"]:
            target["image"] = urllib.parse.unquote(row["image"].rsplit("/", 1)[1])
        target["transfermarkt"] = target["transfermarkt"] or integer_or_none(row.get("transfermarkt"))
        target["female"] = target["female"] or row.get("gender", "").endswith(FEMALE)
    for row in attributes["labels"]:
        record(row)["labels"].setdefault(row["language"], row["label"])
    for row in attributes["aliases"]:
        record(row)["aliases"].append(row["label"])
    for name in ("sport_countries", "citizenships"):
        for row in attributes[name]:
            identifier = entity_id(row["country"])
            if identifier not in record(row)[name]:
                record(row)[name].append(identifier)
    for row in attributes["positions"]:
        record(row)["positions"].append(row["label"])
    return players


def link_by_birth_and_name(unlinked_ids, transfermarkt_players, wikidata_players, scope_ids):
    by_birth_date = defaultdict(list)
    by_birth_year = defaultdict(list)
    for identifier in sorted(scope_ids, key=entity_number):
        candidate = wikidata_players.get(identifier)
        if candidate and candidate["birth"] and candidate["transfermarkt"] is None:
            names = {normalize(name) for name in list(candidate["labels"].values()) + candidate["aliases"]}
            tokens = {token for name in names for token in name.split()}
            by_birth_date[candidate["birth"]].append((identifier, tokens))
            by_birth_year[candidate["birth"][:4]].append((identifier, names))
    links = {}
    taken = set()

    def claim(player_id, matches):
        if len(matches) == 1:
            links[player_id] = matches[0]
            taken.add(matches[0])

    for player_id in sorted(unlinked_ids):
        row = transfermarkt_players[player_id]
        tokens = set(normalize(row["name"]).split())
        same_date = by_birth_date.get(row["date_of_birth"][:10], [])
        claim(player_id, [identifier for identifier, known in same_date if identifier not in taken and tokens & known])
    for player_id in sorted(unlinked_ids):
        if player_id in links:
            continue
        row = transfermarkt_players[player_id]
        name = normalize(row["name"])
        same_year = by_birth_year.get(row["date_of_birth"][:4], [])
        claim(player_id, [identifier for identifier, known in same_year if identifier not in taken and name in known])
    return links


def resolve_countries(identifiers, countries, aliases):
    resolved = [aliases.get(identifier, identifier) for identifier in identifiers]
    return list(dict.fromkeys(identifier for identifier in resolved if identifier in countries))


def build(refresh=False):
    leagues ={row["code"]: row for row in read_override("leagues.csv")}
    clubs, club_by_wikidata_id, membership_rows = resolve_clubs(leagues, refresh)
    countries, country_by_name, country_aliases = load_countries(refresh)

    transfermarkt_players = {int(row["player_id"]): row for row in transfermarkt.rows("players", refresh)}
    transfermarkt_spells = collect_transfermarkt_spells(clubs, transfermarkt_players, refresh)
    wikidata_spells = collect_wikidata_spells(membership_rows, club_by_wikidata_id)
    scope_ids = set(wikidata_spells)

    wikidata_by_transfermarkt, transfermarkt_by_wikidata = link_by_identifier(transfermarkt_players, scope_ids, refresh)
    extra_ids = {wikidata_by_transfermarkt[key] for key in transfermarkt_spells if key in wikidata_by_transfermarkt} - scope_ids
    scopes = [wikidata.club_scope(set(club_by_wikidata_id))] + wikidata.player_scopes(extra_ids)
    wikidata_players = load_wikidata_players(scopes, refresh)
    markets = read_override("markets.csv")
    for language in sorted({market["language"] for market in markets}):
        for row in wikidata.player_articles(scopes, language, refresh):
            if entity_id(row["player"]) in wikidata_players:
                wikidata_players[entity_id(row["player"])]["articles"][language] = row["title"]
    women = {identifier for identifier in scope_ids if wikidata_players.get(identifier, {}).get("female")}
    scope_ids -= women

    unlinked_ids = [key for key in transfermarkt_spells if key not in wikidata_by_transfermarkt]
    fuzzy_links = link_by_birth_and_name(unlinked_ids, transfermarkt_players, wikidata_players, scope_ids)

    entities = []
    consumed = set()
    for player_id in sorted(transfermarkt_spells):
        identifier = wikidata_by_transfermarkt.get(player_id) or fuzzy_links.get(player_id)
        entities.append((player_id, identifier))
        if identifier:
            consumed.add(identifier)
    for identifier in sorted(scope_ids - consumed, key=entity_number):
        entities.append((transfermarkt_by_wikidata.get(identifier), identifier))

    players = []
    player_names = []
    player_countries = []
    player_clubs = []
    unmapped_countries = Counter()
    nameless = 0
    rumors = 0

    for transfermarkt_id, wikidata_id in entities:
        source = transfermarkt_players.get(transfermarkt_id) if transfermarkt_id else None
        entry = wikidata_players.get(wikidata_id) if wikidata_id else None
        labels = entry["labels"] if entry else {}
        variants = [source["name"] if source else None]
        variants += [labels.get(language) for language in NAME_LANGUAGES]
        variants += entry["aliases"] if entry else []
        variants = [variant.strip() for variant in variants if variant and variant.strip()]
        if not variants:
            nameless += 1
            continue
        player_id = entity_number(wikidata_id) if wikidata_id else TRANSFERMARKT_ONLY_ID_OFFSET + transfermarkt_id

        seen = set()
        for variant in variants:
            normalized = normalize(variant)
            if normalized and normalized not in seen:
                seen.add(normalized)
                player_names.append((player_id, variant, normalized))

        primary = None
        if source and source["country_of_citizenship"]:
            primary = country_by_name.get(normalize(source["country_of_citizenship"]))
            if primary is None:
                unmapped_countries[source["country_of_citizenship"]] += 1
        sport_countries = resolve_countries(entry["sport_countries"] if entry else [], countries, country_aliases)
        citizenships = resolve_countries(entry["citizenships"] if entry else [], countries, country_aliases)
        if primary is None and len(sport_countries) == 1:
            primary = sport_countries[0]
        if primary is None and not sport_countries and len(citizenships) == 1:
            primary = citizenships[0]
        nationality_ids = list(dict.fromkeys(([primary] if primary else []) + sport_countries + citizenships))
        for identifier in nationality_ids:
            player_countries.append((player_id, countries[identifier]["id"], int(identifier == primary)))

        position = TRANSFERMARKT_POSITIONS.get(source["position"]) if source else None
        birth = source["date_of_birth"][:10] if source and source["date_of_birth"] else None
        players.append(
            {
                "id": player_id,
                "name": display_name(variants),
                "birth_date": birth or (entry["birth"] if entry else None),
                "position": position or (position_from_labels(entry["positions"]) if entry else None),
                "sitelinks": (entry["sitelinks"] if entry else None) or 0,
                "highest_market_value_eur": integer_or_none(source["highest_market_value_in_eur"]) if source else None,
                "international_caps": integer_or_none(source["international_caps"]) if source else None,
                "commons_file": entry["image"] if entry else None,
                "articles": entry["articles"] if entry else {},
                "transfermarkt_id": transfermarkt_id,
                "wikidata_id": wikidata_id,
                "has_nationality": bool(nationality_ids),
            }
        )

        merged = {}
        for spells in (transfermarkt_spells.get(transfermarkt_id, {}), wikidata_spells.get(wikidata_id, {})):
            for club_id, spell in spells.items():
                target = merged.setdefault(club_id, Spell())
                target.starts += spell.starts
                target.ends += spell.ends
                target.appearances += spell.appearances
                target.sources |= spell.sources
        for club_id, spell in merged.items():
            if spell.is_rumor:
                rumors += 1
                continue
            player_clubs.append(
                (
                    player_id,
                    club_id,
                    spell.first_year,
                    spell.last_year,
                    spell.appearances,
                    "+".join(sorted(spell.sources)),
                    int(spell.is_confirmed),
                )
            )

    player_fame = []
    for market in markets:
        language = market["language"]
        views = wikipedia.recent_views(
            language, [player["articles"][language] for player in players if language in player["articles"]], refresh
        )
        for player in players:
            local_views = views.get(player["articles"].get(language), 0)
            score = fame.score(local_views, player["sitelinks"], player["highest_market_value_eur"], player["international_caps"])
            player_fame.append((player["id"], market["code"], score, local_views))

    stats = {
        "transfermarkt_players_in_scope": len(transfermarkt_spells),
        "wikidata_players_in_scope": len(scope_ids),
        "linked_by_identifier": sum(1 for key in transfermarkt_spells if key in wikidata_by_transfermarkt),
        "linked_by_birth_and_name": len(fuzzy_links),
        "transfermarkt_only": sum(1 for key, identifier in entities if key and not identifier),
        "wikidata_only": sum(1 for key, identifier in entities if identifier and not key),
        "players_without_name": nameless,
        "women_excluded": len(women),
        "rumor_spells_dropped": rumors,
        "unmapped_countries": unmapped_countries.most_common(),
    }
    return {
        "markets": markets,
        "player_fame": player_fame,
        "leagues": leagues,
        "countries": countries,
        "clubs": clubs,
        "players": players,
        "player_names": player_names,
        "player_countries": player_countries,
        "player_clubs": player_clubs,
        "stats": stats,
    }
