import re
from collections import defaultdict

from . import wikidata, wikipedia
from .wikidata import entity_id, entity_number

LANGUAGE = "en"
MINIMUM_SQUAD = 11
HEADING = re.compile(r"^(=+)\s*(.*?)\s*=+\s*$", re.MULTILINE)
SQUAD_HEADING = re.compile(r"current squad|first[- ]team squad|^players$|^squad$", re.IGNORECASE)
LOAN_HEADING = re.compile(r"loan", re.IGNORECASE)
OTHER_TEAM = re.compile(
    r"reserve|youth|academy|under[- ]?\d|\bu-?\d|\bb team|second team|women|former|retired|notable|record|award|captain",
    re.IGNORECASE,
)
ENTRY = re.compile(r"\{\{\s*(?:fs player|football squad player)\d?\s*\|", re.IGNORECASE)
PLAYER = re.compile(ENTRY.pattern + r"[^{}]*?\bname\s*=\s*\[\[([^\]|#]+)", re.IGNORECASE)


def squad_sections(text):
    headings = [(match.start(), match.end(), len(match.group(1)), match.group(2)) for match in HEADING.finditer(text)]
    level = None
    for index, (_, end, depth, heading) in enumerate(headings):
        if level is None:
            if not SQUAD_HEADING.search(heading):
                continue
            level = depth
        elif depth < level or (depth == level and not LOAN_HEADING.search(heading)):
            break
        elif OTHER_TEAM.search(heading):
            continue
        yield text[end : headings[index + 1][0] if index + 1 < len(headings) else len(text)]


def squad_size(text):
    return sum(len(ENTRY.findall(body)) for body in squad_sections(text))


def squad_titles(text):
    titles = [title.strip().replace("_", " ") for body in squad_sections(text) for title in PLAYER.findall(body)]
    return list(dict.fromkeys(title for title in titles if title))


def current(club_by_wikidata_id, refresh=False):
    pages = defaultdict(list)
    for row in wikidata.club_articles(set(club_by_wikidata_id), LANGUAGE, refresh):
        pages[club_by_wikidata_id[entity_id(row["club"])]].append((entity_number(entity_id(row["club"])), row["title"]))
    texts = wikipedia.page_texts(LANGUAGE, sorted({title for entries in pages.values() for _, title in entries}), refresh)

    listed = {}
    for club_id, entries in pages.items():
        page = max((texts.get(title) or "" for _, title in sorted(entries)), key=squad_size)
        if squad_size(page) >= MINIMUM_SQUAD:
            listed[club_id] = squad_titles(page)

    items = wikipedia.page_items(LANGUAGE, sorted({title for titles in listed.values() for title in titles}), refresh)
    return {
        club_id: list(dict.fromkeys(items[title] for title in titles if items.get(title)))
        for club_id, titles in listed.items()
    }
