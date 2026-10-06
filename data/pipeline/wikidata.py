import hashlib
import json
import time
import urllib.error
import urllib.parse
import urllib.request

from .config import CACHE_DIR, LANGUAGES, USER_AGENT, WIKIDATA_SPARQL_URL

PREFIXES = """
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX p: <http://www.wikidata.org/prop/>
PREFIX ps: <http://www.wikidata.org/prop/statement/>
PREFIX pq: <http://www.wikidata.org/prop/qualifier/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX schema: <http://schema.org/>
"""

FOOTBALLER = "wd:Q937857"
FEMALE = "Q6581072"
NEUTRAL_LANGUAGE = "mul"
NAME_FALLBACK_LANGUAGES = ("es", "it", "fr", "de")


def quoted(languages):
    return ", ".join(f'"{language}"' for language in dict.fromkeys(languages))


LABEL_LANGUAGES = quoted((*LANGUAGES, NEUTRAL_LANGUAGE))
PLAYER_LABEL_LANGUAGES = quoted((*LANGUAGES, NEUTRAL_LANGUAGE, *NAME_FALLBACK_LANGUAGES))

PLAYER_QUERIES = {
    "core": "SELECT ?player ?sitelinks ?birth ?image ?transfermarkt ?gender WHERE { %s "
    "OPTIONAL { ?player wikibase:sitelinks ?sitelinks } OPTIONAL { ?player wdt:P569 ?birth } "
    "OPTIONAL { ?player wdt:P18 ?image } OPTIONAL { ?player wdt:P2446 ?transfermarkt } "
    "OPTIONAL { ?player wdt:P21 ?gender } }",
    "labels": "SELECT ?player ?label (LANG(?label) AS ?language) WHERE { %s "
    f"?player rdfs:label ?label FILTER(LANG(?label) IN ({PLAYER_LABEL_LANGUAGES})) }}",
    "aliases": "SELECT ?player ?label WHERE { %s "
    f"?player skos:altLabel ?label FILTER(LANG(?label) IN ({LABEL_LANGUAGES})) }}",
    "sport_countries": "SELECT ?player ?country WHERE { %s ?player wdt:P1532 ?country }",
    "citizenships": "SELECT ?player ?country WHERE { %s ?player wdt:P27 ?country }",
    "positions": "SELECT ?player ?label WHERE { %s ?player wdt:P413 ?position . "
    '?position rdfs:label ?label FILTER(LANG(?label) = "en") }',
}


def entity_id(uri):
    return uri.rsplit("/", 1)[1]


def entity_number(identifier):
    return int(identifier[1:])


def values(identifiers):
    return " ".join(f"wd:{identifier}" for identifier in sorted(identifiers, key=entity_number))


def select(name, query, refresh=False):
    digest = hashlib.sha1(query.encode("utf-8")).hexdigest()[:12]
    path = CACHE_DIR / "wikidata" / f"{name}-{digest}.json"
    if path.exists() and not refresh:
        return json.loads(path.read_text(encoding="utf-8"))
    body = urllib.parse.urlencode({"query": PREFIXES + query}).encode("utf-8")
    headers = {"User-Agent": USER_AGENT, "Accept": "application/sparql-results+json"}
    for attempt in range(4):
        try:
            request = urllib.request.Request(WIKIDATA_SPARQL_URL, data=body, headers=headers)
            with urllib.request.urlopen(request, timeout=600) as response:
                bindings = json.load(response)["results"]["bindings"]
            break
        except (urllib.error.URLError, TimeoutError):
            if attempt == 3:
                raise
            time.sleep(10 * (attempt + 1))
    rows = [{key: cell["value"] for key, cell in binding.items()} for binding in bindings]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")
    return rows


def club_scope(club_ids):
    return (
        "{ SELECT DISTINCT ?player WHERE { VALUES ?club { %s } "
        "?player wdt:P106 %s ; p:P54 ?statement . ?statement ps:P54 ?club } }" % (values(club_ids), FOOTBALLER)
    )


def player_scopes(player_ids, size=2000):
    ordered = sorted(player_ids, key=entity_number)
    return ["VALUES ?player { %s }" % values(ordered[start : start + size]) for start in range(0, len(ordered), size)]


def transfermarkt_team_ids(refresh=False):
    return select("transfermarkt-team-ids", "SELECT ?club ?transfermarkt WHERE { ?club wdt:P7223 ?transfermarkt }", refresh)


def transfermarkt_player_ids(refresh=False):
    return select(
        "transfermarkt-player-ids", "SELECT ?player ?transfermarkt WHERE { ?player wdt:P2446 ?transfermarkt }", refresh
    )


def parents(club_ids, refresh=False):
    query = "SELECT ?club ?parent WHERE { VALUES ?club { %s } ?club wdt:P361 ?parent }" % values(club_ids)
    return select("club-parents", query, refresh)


def memberships(club_ids, refresh=False):
    query = (
        "SELECT ?player ?club ?start ?end WHERE { VALUES ?club { %s } "
        "?player wdt:P106 %s ; p:P54 ?statement . ?statement ps:P54 ?club . "
        "MINUS { ?statement wikibase:rank wikibase:DeprecatedRank } "
        "OPTIONAL { ?statement pq:P580 ?start } OPTIONAL { ?statement pq:P582 ?end } }" % (values(club_ids), FOOTBALLER)
    )
    return select("memberships", query, refresh)


def labels(identifiers, refresh=False):
    query = (
        "SELECT ?item ?label (LANG(?label) AS ?language) WHERE { VALUES ?item { %s } "
        "?item rdfs:label ?label FILTER(LANG(?label) IN (%s)) }" % (values(identifiers), LABEL_LANGUAGES)
    )
    return select("labels", query, refresh)


def countries(extra_ids, refresh=False):
    query = (
        "SELECT ?country ?code ?label (LANG(?label) AS ?language) WHERE { "
        "{ ?country wdt:P297 ?code FILTER NOT EXISTS { ?country wdt:P576 ?dissolved } } "
        "UNION { VALUES ?country { %s } } "
        "?country rdfs:label ?label FILTER(LANG(?label) IN (%s)) }" % (values(extra_ids), LABEL_LANGUAGES)
    )
    return select("countries", query, refresh)


def player_attributes(scopes, refresh=False):
    return {
        name: [row for scope in scopes for row in select(f"player-{name}", template % scope, refresh)]
        for name, template in PLAYER_QUERIES.items()
    }


def player_articles(scopes, language, refresh=False):
    template = (
        "SELECT ?player ?title WHERE { %s ?article schema:about ?player ; "
        f"schema:isPartOf <https://{language}.wikipedia.org/> ; schema:name ?title }}"
    )
    return [row for scope in scopes for row in select(f"player-articles-{language}", template % scope, refresh)]
