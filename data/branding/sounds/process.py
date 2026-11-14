import json
import subprocess
import sys
from pathlib import Path

import numpy as np

RATE = 44100

ROLES = {
    "whistle": {"max": 1.3, "fade": 0.12, "target": -16},
    "win": {"max": 4.0, "fade": 0.9, "target": -16},
    "reward": {"max": 2.0, "fade": 0.3, "target": -18},
    "wrong": {"max": 2.0, "fade": 0.4, "target": -19},
    "correct": {"max": 1.2, "fade": 0.15, "target": -18},
    "impact": {"max": 0.6, "fade": 0.12, "target": -17},
    "tick": {"max": 0.2, "fade": 0.03, "target": -24},
    "whoosh": {"max": 0.7, "fade": 0.12, "target": -20},
    "boing": {"max": 1.0, "fade": 0.15, "target": -18},
    "pop": {"max": 0.5, "fade": 0.08, "target": -19},
    "sad": {"max": 3.5, "fade": 0.6, "target": -19},
    "ambience": {"max": 40.0, "fade": 2.0, "target": -30},
}

SHORTLIST = {
    "whistle": ["fs:218318", "fs:538422", "fs:631849", "fs:817398"],
    "win": ["fs:528799", "fs:182571", "fs:221567", "fs:139972", "kenney:jingles/jingles_STEEL07.ogg"],
    "reward": [
        "kenney:jingles/jingles_HIT15.ogg",
        "kenney:jingles/jingles_SAX07.ogg",
        "kenney:jingles/jingles_STEEL01.ogg",
        "kenney:casino/chips-collide-1.ogg",
    ],
    "wrong": ["fs:124996", "fs:763809", "kenney:interface/error_006.ogg", "kenney:interface/error_003.ogg"],
    "correct": ["kenney:interface/confirmation_002.ogg", "kenney:interface/confirmation_004.ogg", "fs:421002", "fs:538147"],
    "impact": ["fs:555042", "fs:261267", "fs:446639", "kenney:casino/card-place-1.ogg", "kenney:casino/card-slide-3.ogg"],
    "tick": ["kenney:interface/tick_004.ogg", "kenney:interface/tick_001.ogg", "fs:429721", "fs:509714"],
    "whoosh": ["fs:60013", "fs:243400", "fs:127197", "fs:346373"],
    "boing": ["fs:61847", "fs:540790", "fs:88451"],
    "pop": ["fs:202230", "fs:221091", "fs:447910"],
    "sad": ["fs:175409", "fs:362206", "fs:543966", "fs:542195"],
    "ambience": ["fs:829454", "fs:868982", "fs:424354", "fs:876549", "fs:328623"],
}


def decode(path: Path, channels: int) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-ac", str(channels), "-ar", str(RATE), "-f", "f32le", "-"],
        capture_output=True,
        check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, channels).copy()


def levels(samples: np.ndarray, window: float) -> np.ndarray:
    mono = samples.mean(axis=1)
    size = max(1, min(int(RATE * window), mono.size))
    frames = mono[: mono.size // size * size].reshape(-1, size)
    return 20 * np.log10(np.sqrt(np.mean(frames**2, axis=1)) + 1e-9)


def active_start(samples: np.ndarray) -> int:
    level = levels(samples, 0.005)
    loud = level > level.max() - 35
    return max(0, int(np.argmax(loud)) * int(RATE * 0.005) - int(RATE * 0.004))


def loudest_window_start(samples: np.ndarray, length: float) -> int:
    level = levels(samples, 0.1)
    span = max(1, int(length / 0.1))
    energy = np.convolve(10 ** (level / 10), np.ones(span), mode="valid")
    best = int(np.argmax(energy))
    return max(0, best * int(RATE * 0.1) - int(RATE * 0.3))


def steadiest_window_start(samples: np.ndarray, length: float) -> int:
    level = levels(samples, 1.0)
    span = int(length)
    best, best_score = 0, float("inf")
    for start in range(0, max(1, level.size - span)):
        window = level[start : start + span]
        score = float(np.std(window)) + max(0.0, float(window.max() - np.median(window)) - 5) * 2
        if score < best_score:
            best, best_score = start, score
    return best * RATE


def shape(samples: np.ndarray, setting: dict) -> np.ndarray:
    fade_in = max(1, int(RATE * 0.004))
    samples[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
    fade_out = min(samples.shape[0], int(RATE * setting["fade"]))
    if fade_out > 0:
        samples[-fade_out:] *= (np.linspace(1, 0, fade_out) ** 2)[:, None]
    return samples


def loop(samples: np.ndarray, length: float, crossfade: float) -> np.ndarray:
    body = int(RATE * length)
    overlap = int(RATE * crossfade)
    out = samples[:body].copy()
    ramp = np.linspace(0, 1, overlap)[:, None]
    out[:overlap] = samples[:overlap] * np.sqrt(ramp) + samples[body : body + overlap] * np.sqrt(1 - ramp)
    return out


def normalize(samples: np.ndarray, target: float, ambience: bool) -> tuple[np.ndarray, float]:
    level = levels(samples, 0.05)
    active = level[level > level.max() - 25] if not ambience else level
    rms = 10 * np.log10(np.mean(10 ** (active / 10)))
    peak = 20 * np.log10(np.abs(samples).max() + 1e-9)
    gain = target - rms
    ceiling = -1.5 if not ambience else -6.0
    if peak + gain > ceiling:
        gain = ceiling - peak
    return samples * (10 ** (gain / 20)), round(float(gain), 1)


def encode(samples: np.ndarray, target: Path, arguments: list[str]) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(RATE), "-ac", str(samples.shape[1]), "-i", "-", *arguments, str(target)],
        input=samples.astype(np.float32).tobytes(),
        check=True,
    )


def source_of(reference: str, downloads: Path, catalog: dict) -> tuple[Path, dict]:
    kind, key = reference.split(":", 1)
    if kind == "fs":
        for entries in catalog["freesound"].values():
            for entry in entries:
                if entry["id"] == int(key):
                    return downloads / entry["file"], {
                        "source": "Freesound",
                        "title": entry["title"],
                        "author": entry["user"],
                        "page": entry["page"],
                        "license": "CC0",
                    }
        raise KeyError(reference)
    pack, name = key.split("/", 1)
    return downloads / "kenney" / pack / "files" / name, {
        "source": "Kenney",
        "title": name,
        "author": "Kenney",
        "page": catalog["kenney"][pack]["page"],
        "license": "CC0",
    }


def build(downloads: Path, masters: Path, audition: Path) -> list[dict]:
    catalog = json.loads((downloads / "catalog.json").read_text(encoding="utf-8"))
    made = []
    for role, references in SHORTLIST.items():
        setting = ROLES[role]
        ambience = role == "ambience"
        for index, reference in enumerate(references):
            path, info = source_of(reference, downloads, catalog)
            samples = decode(path, 2 if ambience else 1)
            length = setting["max"]
            if ambience:
                start = steadiest_window_start(samples, length + setting["fade"] + 1)
                clip = loop(samples[start:], length, setting["fade"])
            else:
                long_source = samples.shape[0] / RATE > length * 1.6
                start = loudest_window_start(samples, length) if long_source and role in ("win", "sad", "wrong") else active_start(samples)
                clip = shape(samples[start : start + int(RATE * length)].copy(), setting)
            clip, gain = normalize(clip, setting["target"], ambience)
            name = f"{role}-{chr(ord('a') + index)}"
            encode(clip, masters / role / f"{name}.wav", ["-c:a", "pcm_s16le"])
            encode(clip, audition / f"{name}.mp3", ["-c:a", "libmp3lame", "-b:a", "160k"])
            made.append(
                {
                    "role": role,
                    "name": name,
                    "reference": reference,
                    "start": round(start / RATE, 2),
                    "duration": round(clip.shape[0] / RATE, 2),
                    "gain_db": gain,
                    **info,
                }
            )
            print(f"{name:11} {made[-1]['duration']:5.2f}s from {made[-1]['start']:6.2f}s gain {gain:6.1f}  {info['title'][:50]}", flush=True)
    return made


if __name__ == "__main__":
    downloads, masters, audition = (Path(argument) for argument in sys.argv[1:4])
    made = build(downloads, masters, audition)
    (audition / "candidates.json").write_text(json.dumps(made, indent=2, ensure_ascii=False), encoding="utf-8")
