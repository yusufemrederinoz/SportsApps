import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

OUT = Path(sys.argv[1])
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
PER_QUERY = 6

QUERIES = {
    "whistle": [("referee whistle", 0.3, 4)],
    "win": [("crowd cheer", 2, 10), ("stadium goal celebration", 2, 12)],
    "wrong": [("crowd disappointed", 0.8, 5), ("crowd groan", 0.8, 5)],
    "impact": [("soccer ball kick", 0.05, 2), ("football kick", 0.05, 2)],
    "whoosh": [("whoosh", 0.15, 1.5)],
    "boing": [("boing", 0.2, 2)],
    "pop": [("pop", 0.03, 0.8)],
    "sad": [("sad trombone", 1, 5)],
    "ambience": [("stadium crowd ambience", 20, 400), ("football stadium crowd", 20, 400)],
    "correct": [("correct answer", 0.2, 2)],
    "tick": [("clock tick", 0.02, 0.6)],
}

KENNEY = {
    "interface": "https://opengameart.org/content/interface-sounds",
    "ui": "https://opengameart.org/content/51-ui-sound-effects-buttons-switches-and-clicks",
    "casino": "https://opengameart.org/content/54-casino-sound-effects-cards-dice-chips",
    "jingles": "https://opengameart.org/content/85-short-music-jingles",
}

PLAYER = re.compile(r'<div\s+class="bw-player"(.*?)>', re.S)
ATTRIBUTE = re.compile(r'data-([a-z0-9-]+)="([^"]*)"')


def get(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def search(query: str, low: float, high: float) -> list[dict]:
    filters = f'license:"Creative Commons 0" duration:[{low} TO {high}]'
    parameters = urllib.parse.urlencode({"q": query, "f": filters, "s": "Downloads (most first)"})
    page = get(f"https://freesound.org/search/?{parameters}").decode("utf-8", "replace")
    found = []
    for block in PLAYER.findall(page):
        fields = {key: html.unescape(value) for key, value in ATTRIBUTE.findall(block)}
        if "sound-id" not in fields:
            continue
        found.append(
            {
                "id": int(fields["sound-id"]),
                "user": fields.get("username", ""),
                "title": fields.get("title", ""),
                "duration": float(fields.get("duration", "0") or 0),
                "downloads": int(fields.get("num-downloads", "0") or 0),
                "preview": fields["mp3"].replace("-lq.mp3", "-hq.ogg"),
                "page": f"https://freesound.org/people/{fields.get('username', '')}/sounds/{fields['sound-id']}/",
                "license": "CC0",
            }
        )
    return found


def fetch_freesound() -> dict:
    catalog = {}
    for role, queries in QUERIES.items():
        seen = set()
        entries = []
        for query, low, high in queries:
            for entry in search(query, low, high)[:PER_QUERY]:
                if entry["id"] in seen:
                    continue
                seen.add(entry["id"])
                target = OUT / "freesound" / role / f"{entry['id']}.ogg"
                target.parent.mkdir(parents=True, exist_ok=True)
                if not target.exists():
                    target.write_bytes(get(entry["preview"]))
                entry["file"] = str(target.relative_to(OUT))
                entry["query"] = query
                entries.append(entry)
            time.sleep(1)
        catalog[role] = entries
        print(role, len(entries), flush=True)
    return catalog


def fetch_kenney() -> dict:
    packs = {}
    for name, page_url in KENNEY.items():
        page = get(page_url).decode("utf-8", "replace")
        links = sorted(set(re.findall(r'https://opengameart.org/sites/default/files/[^"\']+\.zip', page)))
        folder = OUT / "kenney" / name
        folder.mkdir(parents=True, exist_ok=True)
        for link in links:
            archive = folder / Path(urllib.parse.unquote(link)).name
            if not archive.exists():
                archive.write_bytes(get(link))
            with zipfile.ZipFile(archive) as bundle:
                for member in bundle.namelist():
                    if member.lower().endswith((".ogg", ".wav", ".mp3")) and ".." not in member:
                        target = folder / "files" / Path(member).name
                        target.parent.mkdir(parents=True, exist_ok=True)
                        target.write_bytes(bundle.read(member))
        packs[name] = {"page": page_url, "archives": links, "license": "CC0"}
        print(name, len(list((folder / "files").glob("*"))), flush=True)
    return packs


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    catalog = {"freesound": fetch_freesound(), "kenney": fetch_kenney()}
    (OUT / "catalog.json").write_text(json.dumps(catalog, indent=2, ensure_ascii=False), encoding="utf-8")
