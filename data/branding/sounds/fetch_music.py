import json
import sys
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))

import fetch_candidates as fetch
import process

MIXKIT = {
    "1001": "extreme sports, action",
    "989": "action",
    "158": "extreme sports",
    "706": "workout",
    "113": "motivational, action",
    "78": "nightlife, extreme sports",
    "94": "action",
}
FREESOUND = [("upbeat hip hop loop", 20, 200), ("energetic sport music", 20, 240), ("epic sport rock", 20, 240)]
LENGTH = 30.0
TARGET = -18


def clip(samples: np.ndarray) -> np.ndarray:
    start = process.loudest_window_start(samples, LENGTH)
    start = max(0, start - int(process.RATE * 1.5))
    piece = samples[start : start + int(process.RATE * LENGTH)].copy()
    fade_in = int(process.RATE * 0.25)
    fade_out = int(process.RATE * 2.0)
    piece[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
    piece[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]
    loud, _ = process.normalize(piece, TARGET, False)
    return loud


def main(downloads: Path, audition: Path) -> None:
    folder = downloads / "music"
    folder.mkdir(parents=True, exist_ok=True)
    made = []
    for number, tags in MIXKIT.items():
        source = folder / f"mixkit-{number}.mp3"
        if not source.exists():
            source.write_bytes(fetch.get(f"https://assets.mixkit.co/music/{number}/{number}.mp3"))
        made.append({"source": "Mixkit", "id": number, "path": source, "title": f"Mixkit {number} ({tags})", "author": "Mixkit",
                     "page": "https://mixkit.co/free-stock-music/tag/sports/", "license": "Mixkit Stock Music Free License"})
    for query, low, high in FREESOUND:
        for entry in fetch.search(query, low, high)[:3]:
            source = folder / f"freesound-{entry['id']}.ogg"
            if not source.exists():
                source.write_bytes(fetch.get(entry["preview"]))
            made.append({"source": "Freesound", "id": str(entry["id"]), "path": source, "title": entry["title"], "author": entry["user"],
                         "page": entry["page"], "license": "CC0", "downloads": entry["downloads"]})
        time.sleep(1)
    candidates = []
    for index, item in enumerate(made):
        samples = process.decode(item["path"], 2)
        if samples.shape[0] < process.RATE * 18:
            print("too short", item["title"])
            continue
        piece = clip(samples)
        name = f"music-{chr(ord('a') + len(candidates))}"
        process.encode(piece, audition / "audio" / f"{name}.mp3", ["-c:a", "libmp3lame", "-b:a", "192k"])
        process.encode(piece, audition / "music-masters" / f"{name}.wav", ["-c:a", "pcm_s16le"])
        candidates.append({
            "role": "music", "name": name, "title": item["title"], "author": item["author"], "source": item["source"],
            "page": item["page"], "license": item["license"], "duration": round(piece.shape[0] / process.RATE, 2),
            "source_file": item["path"].name,
        })
        print(name, item["source"], item["title"][:60], item.get("downloads", ""))
    (audition / "audio" / "candidates-music.json").write_text(json.dumps(candidates, indent=2, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
