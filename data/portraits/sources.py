import csv
import html
import http.client
import json
import re
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from pipeline.config import DATABASE_PATH, OVERRIDES_DIR, USER_AGENT

from .config import LARGE_SOURCE_WIDTH, MARKET, METADATA_PATH, MINIMUM_FAME, SOURCE_DIR, SOURCE_WIDTH

API_URL = "https://commons.wikimedia.org/w/api.php"
OVERRIDES_PATH = OVERRIDES_DIR / "portrait_files.csv"
BATCH_SIZE = 40
DOWNLOAD_WORKERS = 2
MAX_ATTEMPTS = 6
MAX_WAIT_SECONDS = 120
METADATA_FIELDS = "LicenseShortName|LicenseUrl|License|Artist|Credit|AttributionRequired|UsageTerms"
PHOTO_TYPES = ("image/jpeg", "image/png", "image/webp", "image/tiff")
ARTIST_MAX_LENGTH = 120

FREE_LICENSE = re.compile(r"^(cc0|cc[ -]by([ -]sa)?([ -]\d\.\d)?([ -][a-z]{2,5})*|pd|public domain)", re.IGNORECASE)
RESTRICTED_LICENSE = re.compile(r"(^|[ -])(nc|nd)($|[ -])", re.IGNORECASE)
TAG = re.compile(r"<[^>]+>")
SPACE = re.compile(r"\s+")


def is_free_license(short_name):
    name = (short_name or "").strip()
    return bool(FREE_LICENSE.match(name)) and not RESTRICTED_LICENSE.search(name)


def plain_text(markup):
    text = html.unescape(TAG.sub(" ", markup or ""))
    return SPACE.sub(" ", text).strip()


def artist_name(markup):
    name = plain_text(markup)
    return name if len(name) <= ARTIST_MAX_LENGTH else name[: ARTIST_MAX_LENGTH - 1].rstrip() + "…"


def describe(info):
    extra = {key: value.get("value", "") for key, value in info.get("extmetadata", {}).items()}
    license_name = plain_text(extra.get("LicenseShortName", ""))
    return {
        "url": info.get("thumburl") or info.get("url"),
        "page": info.get("descriptionurl"),
        "width": info.get("width", 0),
        "height": info.get("height", 0),
        "mime": info.get("mime", ""),
        "license": license_name,
        "license_url": extra.get("LicenseUrl", ""),
        "artist": artist_name(extra.get("Artist", "")),
        "free": is_free_license(license_name) and info.get("mime") in PHOTO_TYPES,
    }


def call(url, data=None):
    for attempt in range(1, MAX_ATTEMPTS + 1):
        wait = min(MAX_WAIT_SECONDS, 5 * 2**attempt)
        try:
            request = urllib.request.Request(url, data=data, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(request, timeout=120) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code == 404 or attempt == MAX_ATTEMPTS:
                raise
            retry_after = error.headers.get("Retry-After", "")
            wait = min(MAX_WAIT_SECONDS, int(retry_after)) if retry_after.isdigit() else wait
        except (urllib.error.URLError, TimeoutError):
            if attempt == MAX_ATTEMPTS:
                raise
        time.sleep(wait)


def fetch_metadata(files, width=SOURCE_WIDTH):
    parameters = {
        "action": "query",
        "format": "json",
        "formatversion": "2",
        "prop": "imageinfo",
        "iiprop": "url|size|mime|extmetadata",
        "iiurlwidth": str(width),
        "iiextmetadatafilter": METADATA_FIELDS,
        "titles": "|".join(f"File:{name}" for name in files),
    }
    payload = json.loads(call(API_URL, urllib.parse.urlencode(parameters).encode("utf-8")))
    query = payload.get("query", {})
    renamed = {entry["to"]: entry["from"] for entry in query.get("normalized", [])}
    found = {}
    for page in query.get("pages", []):
        title = renamed.get(page["title"], page["title"])
        info = (page.get("imageinfo") or [None])[0]
        found[title.split(":", 1)[1]] = describe(info) if info else None
    return {name: found.get(name) for name in files}


def load_overrides():
    if not OVERRIDES_PATH.exists():
        return {}
    with open(OVERRIDES_PATH, encoding="utf-8", newline="") as source:
        return {row["wikidata_id"]: row["file"] for row in csv.DictReader(source)}


def target_players(connection, limit=None, with_missing=False):
    overrides = load_overrides()
    rows = connection.execute(
        """SELECT p.id, p.name, p.commons_file, f.fame, p.wikidata_id FROM player_fame f
           JOIN players p ON p.id = f.player_id
           WHERE f.market = ? AND f.fame >= ?
           ORDER BY f.fame DESC, p.id""",
        (MARKET, MINIMUM_FAME),
    ).fetchall()
    players = [
        {"id": row[0], "name": row[1], "file": overrides.get(row[4]) or row[2], "fame": row[3], "wikidata_id": row[4]}
        for row in rows
    ]
    players = [player for player in players if with_missing or player["file"]]
    return players[:limit] if limit else players


def load_metadata():
    return json.loads(METADATA_PATH.read_text(encoding="utf-8")) if METADATA_PATH.exists() else {}


def collect_metadata(players):
    cached = load_metadata()
    missing = sorted({player["file"] for player in players} - set(cached))
    METADATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    for offset in range(0, len(missing), BATCH_SIZE):
        cached.update(fetch_metadata(missing[offset : offset + BATCH_SIZE]))
        METADATA_PATH.write_text(json.dumps(cached, ensure_ascii=False), encoding="utf-8")
    return cached


def source_path(player_id):
    return SOURCE_DIR / f"{player_id}.img"


def large_source_path(player_id):
    return SOURCE_DIR / f"{player_id}.large.img"


def download(player, metadata, target=None):
    target = target or source_path(player["id"])
    if target.exists():
        return True
    try:
        target.write_bytes(call(metadata["url"]))
        return True
    except (urllib.error.URLError, http.client.HTTPException, TimeoutError):
        return False


def fetch(limit=None):
    with sqlite3.connect(DATABASE_PATH) as connection:
        players = target_players(connection, limit)
    metadata = collect_metadata(players)
    usable = [player for player in players if (metadata.get(player["file"]) or {}).get("free")]
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=DOWNLOAD_WORKERS) as pool:
        downloaded = list(pool.map(lambda player: download(player, metadata[player["file"]]), usable))
    return {
        "players": len(players),
        "free": len(usable),
        "downloaded": sum(downloaded),
        "rejected": len(players) - len(usable),
    }


def fetch_large(players):
    wanted = [player for player in players if not large_source_path(player["id"]).exists()]
    made = 0
    for offset in range(0, len(wanted), BATCH_SIZE):
        batch = wanted[offset : offset + BATCH_SIZE]
        metadata = fetch_metadata([player["file"] for player in batch], LARGE_SOURCE_WIDTH)
        usable = [player for player in batch if (metadata.get(player["file"]) or {}).get("free")]
        with ThreadPoolExecutor(max_workers=DOWNLOAD_WORKERS) as pool:
            made += sum(
                pool.map(
                    lambda player: download(player, metadata[player["file"]], large_source_path(player["id"])),
                    usable,
                )
            )
    return {"wanted": len(wanted), "downloaded": made}
