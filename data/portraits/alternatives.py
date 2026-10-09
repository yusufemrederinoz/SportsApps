import csv
import json
import sqlite3
import urllib.parse

from pipeline import wikidata
from pipeline.config import DATABASE_PATH
from pipeline.text import normalize

from .config import CACHE, CROP_DIR, MINIMUM_SOURCE_SIDE, SOURCE_DIR
from .faces import REPORT_PATH, crop_path, examine, load_report, load_tools
from .sources import (
    API_URL,
    BATCH_SIZE,
    METADATA_PATH,
    OVERRIDES_PATH,
    call,
    download,
    fetch_metadata,
    large_source_path,
    load_metadata,
    load_overrides,
    source_path,
    target_players,
)
from .stylize import output_path

ALTERNATIVE_FAME = 30
CATEGORY_FILES = 80
DEPICTED_FILES = 30
CANDIDATES_PER_PLAYER = 6
QUERY_BATCH = 400
PHOTO_SUFFIXES = (".jpg", ".jpeg", ".png")
MINIMUM_NAME_TOKEN = 3
TRIED_PATH = CACHE / "alternatives-tried.json"


def trial_path(player_id):
    return SOURCE_DIR / f"{player_id}.trial.img"


def trial_crop_path(player_id):
    return CROP_DIR / f"{player_id}.trial.png"


def is_usable(entry):
    return bool(entry) and entry.get("status") == "cropped" and entry.get("side", 0) >= MINIMUM_SOURCE_SIDE


def load_tried():
    return json.loads(TRIED_PATH.read_text(encoding="utf-8")) if TRIED_PATH.exists() else {}


def surname(name):
    tokens = [token for token in normalize(name).split() if len(token) >= MINIMUM_NAME_TOKEN]
    return tokens[-1] if tokens else ""


def names_player(file_name, player_name):
    wanted = surname(player_name)
    return bool(wanted) and wanted in normalize(file_name.rsplit(".", 1)[0].replace("_", " "))


def ordered(candidates):
    return sorted(
        candidates,
        key=lambda item: (item[1]["height"] < item[1]["width"] * 0.9, -(item[1]["width"] * item[1]["height"])),
    )


def api(parameters):
    return json.loads(call(API_URL, urllib.parse.urlencode({"action": "query", "format": "json", "formatversion": "2", **parameters}).encode("utf-8")))


def category_files(category):
    payload = api({"list": "categorymembers", "cmtitle": f"Category:{category}", "cmtype": "file", "cmlimit": str(CATEGORY_FILES)})
    return [entry["title"].split(":", 1)[1] for entry in payload.get("query", {}).get("categorymembers", [])]


def depicted_files(wikidata_id):
    payload = api({"list": "search", "srsearch": f"haswbstatement:P180={wikidata_id}", "srnamespace": "6", "srlimit": str(DEPICTED_FILES)})
    return [entry["title"].split(":", 1)[1] for entry in payload.get("query", {}).get("search", [])]


def categories_of(wikidata_ids):
    found = {}
    ordered_ids = sorted(wikidata_ids, key=wikidata.entity_number)
    for start in range(0, len(ordered_ids), QUERY_BATCH):
        batch = ordered_ids[start : start + QUERY_BATCH]
        query = "SELECT ?player ?category WHERE { VALUES ?player { %s } ?player wdt:P373 ?category }" % wikidata.values(batch)
        for row in wikidata.select("portrait-categories", query):
            found[wikidata.entity_id(row["player"])] = row["category"]
    return found


def candidate_files(player, category, tried):
    names = []
    if category:
        names += [name for name in category_files(category) if names_player(name, player["name"])]
    names += depicted_files(player["wikidata_id"])
    photos = [name for name in dict.fromkeys(names) if name.lower().endswith(PHOTO_SUFFIXES) and name not in tried]
    described = {}
    for start in range(0, len(photos), BATCH_SIZE):
        described.update(fetch_metadata(photos[start : start + BATCH_SIZE]))
    free = [(name, info) for name, info in described.items() if info and info.get("free")]
    return ordered(free)[:CANDIDATES_PER_PLAYER]


def save_overrides(overrides):
    OVERRIDES_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OVERRIDES_PATH, "w", encoding="utf-8", newline="") as target:
        writer = csv.writer(target, lineterminator="\n")
        writer.writerow(("wikidata_id", "file"))
        for wikidata_id in sorted(overrides, key=wikidata.entity_number):
            writer.writerow((wikidata_id, overrides[wikidata_id]))


def restore_crops(report, players, tools):
    restored = 0
    for player in players:
        entry = report.get(str(player["id"]))
        if is_usable(entry) and not crop_path(player["id"]).exists() and source_path(player["id"]).exists():
            report[str(player["id"])] = examine(*tools, source_path(player["id"]), crop_path(player["id"]))
            restored += 1
    return restored


def run(limit=None):
    with sqlite3.connect(DATABASE_PATH) as connection:
        players = target_players(connection, None, with_missing=True)
    overrides = load_overrides()
    metadata = load_metadata()
    report = load_report()
    tried = load_tried()
    tools = load_tools()
    counts = {"restored": restore_crops(report, players, tools)}
    wanted = [
        player
        for player in players
        if player["fame"] >= ALTERNATIVE_FAME
        and player["wikidata_id"]
        and not output_path(player["id"]).exists()
        and not is_usable(report.get(str(player["id"])))
    ]
    wanted = wanted[:limit] if limit else wanted
    categories = categories_of([player["wikidata_id"] for player in wanted])
    counts.update({"players": len(wanted), "with_candidates": 0, "replaced": 0})

    def save():
        REPORT_PATH.write_text(json.dumps(report), encoding="utf-8")
        METADATA_PATH.write_text(json.dumps(metadata, ensure_ascii=False), encoding="utf-8")
        TRIED_PATH.write_text(json.dumps(tried, ensure_ascii=False), encoding="utf-8")
        save_overrides(overrides)

    for index, player in enumerate(wanted):
        key = str(player["id"])
        failed = tried.setdefault(key, [])
        if player["file"] and player["file"] not in failed:
            failed.append(player["file"])
        candidates = candidate_files(player, categories.get(player["wikidata_id"]), failed)
        counts["with_candidates"] += bool(candidates)
        for name, info in candidates:
            trial = trial_path(player["id"])
            trial_crop = trial_crop_path(player["id"])
            trial.unlink(missing_ok=True)
            if not download(player, info, trial):
                continue
            result = examine(*tools, trial, trial_crop)
            if is_usable(result):
                trial.replace(source_path(player["id"]))
                trial_crop.replace(crop_path(player["id"]))
                large_source_path(player["id"]).unlink(missing_ok=True)
                report[key] = result
                metadata[name] = info
                overrides[player["wikidata_id"]] = name
                counts["replaced"] += 1
                break
            failed.append(name)
            trial.unlink(missing_ok=True)
            trial_crop.unlink(missing_ok=True)
        if index % 25 == 24:
            save()
            print(f"alternatives: {index + 1}/{len(wanted)} replaced {counts['replaced']}", flush=True)

    save()
    return counts
