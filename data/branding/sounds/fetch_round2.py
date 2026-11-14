import json
import sys
import time
import urllib.parse
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import analyze
import fetch_candidates as fetch

QUERIES = {
    "win": [("success", 0.5, 2.5), ("level complete", 0.8, 3), ("victory", 0.8, 3), ("short crowd cheer", 0.8, 3)],
    "reward": [("coin collect", 0.15, 1.5), ("coins", 0.2, 1.5), ("reward", 0.3, 2), ("achievement", 0.5, 2.5), ("collect item", 0.15, 1.5)],
    "wrong": [("wrong answer", 0.15, 1.2), ("buzzer wrong", 0.15, 1.2), ("error buzz", 0.1, 1.0), ("negative beep", 0.15, 1.2)],
    "impact": [("card flip", 0.05, 0.8), ("card slap", 0.05, 0.8), ("card throw", 0.05, 0.8)],
}
EXTRA_PACKS = {"rpg": "https://opengameart.org/content/50-rpg-sound-effects", "digital": "https://opengameart.org/content/63-digital-sound-effects-lasers-phasers-space-etc"}
PER_QUERY = 6


def main(out: Path) -> None:
    fetch.OUT = out
    catalog = json.loads((out / "catalog.json").read_text(encoding="utf-8"))
    known = {entry["id"] for entries in catalog["freesound"].values() for entry in entries}
    round_two = catalog.setdefault("round2", {})
    for role, queries in QUERIES.items():
        entries = round_two.setdefault(role, [])
        for query, low, high in queries:
            for entry in fetch.search(query, low, high)[:PER_QUERY]:
                if entry["id"] in known:
                    continue
                known.add(entry["id"])
                target = out / "freesound" / f"{role}2" / f"{entry['id']}.ogg"
                target.parent.mkdir(parents=True, exist_ok=True)
                if not target.exists():
                    target.write_bytes(fetch.get(entry["preview"]))
                entry["file"] = str(target.relative_to(out))
                entry["query"] = query
                entry["analysis"] = analyze.describe(analyze.decode(target))
                entries.append(entry)
                info = entry["analysis"]
                print(
                    f"{role:7} {entry['id']:>7} {entry['duration']:5.2f}s {entry['downloads']:>7}dl floor {info['noise_floor_db']:6.1f} "
                    f"peak {info['peak_db']:5.1f} clip {int(info['clipped'])} {entry['title'][:48]} [{entry['user']}]",
                    flush=True,
                )
            time.sleep(1)
    for name, page_url in EXTRA_PACKS.items():
        page = fetch.get(page_url).decode("utf-8", "replace")
        import re

        links = sorted(set(re.findall(r'https://opengameart.org/sites/default/files/[^"\']+\.zip', page)))
        folder = out / "kenney" / name
        (folder / "files").mkdir(parents=True, exist_ok=True)
        for link in links:
            archive = folder / Path(urllib.parse.unquote(link)).name
            if not archive.exists():
                archive.write_bytes(fetch.get(link))
            with zipfile.ZipFile(archive) as bundle:
                for member in bundle.namelist():
                    if member.lower().endswith((".ogg", ".wav", ".mp3")) and ".." not in member:
                        (folder / "files" / Path(member).name).write_bytes(bundle.read(member))
        catalog["kenney"][name] = {"page": page_url, "archives": links, "license": "CC0"}
        print(name, sorted(path.name for path in (folder / "files").iterdir())[:80])
    (out / "catalog.json").write_text(json.dumps(catalog, indent=2, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
