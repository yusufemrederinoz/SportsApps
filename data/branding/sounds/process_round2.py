import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))

import process

SETTINGS = {
    "win": {"max": 2.0, "fade": 0.45, "target": -17},
    "reward": {"max": 1.5, "fade": 0.25, "target": -18},
    "wrong": {"max": 0.8, "fade": 0.12, "target": -20},
    "impact": {"max": 0.6, "fade": 0.12, "target": -17},
}

SHORTLIST = {
    "win": ["fs:242501", "fs:397355", "fs:456965", "fs:220184", "fs:538145", "fs:764274"],
    "reward": ["fs:58919", "fs:651515", "fs:659677", "fs:715067", "fs:347174", "fs:402067", "kenney:rpg/handleCoins.ogg"],
    "wrong": ["synth:soft", "synth:buzz", "fs:331912", "fs:419023", "fs:700641", "fs:445978", "fs:844147"],
    "impact": ["fs:554208", "fs:828802", "kenney:rpg/bookPlace1.ogg", "kenney:casino/card-shove-2.ogg"],
}

FIRST_LETTER = {"win": "f", "reward": "e", "wrong": "e", "impact": "f"}


def tone(frequency: float, length: float, harmonics: list[float]) -> np.ndarray:
    t = np.arange(int(process.RATE * length)) / process.RATE
    wave = sum(amplitude * np.sin(2 * np.pi * frequency * (index + 1) * t) for index, amplitude in enumerate(harmonics))
    attack = np.minimum(1, t / 0.006)
    decay = np.exp(-t * 9)
    return wave * attack * decay


def room(signal: np.ndarray) -> np.ndarray:
    rng = np.random.default_rng(7)
    length = int(process.RATE * 0.12)
    impulse = rng.standard_normal(length) * np.exp(-np.arange(length) / (process.RATE * 0.03))
    impulse[0] = 0
    wet = np.convolve(signal, impulse)
    dry = np.concatenate([signal, np.zeros(wet.size - signal.size)])
    return dry + 0.035 * wet


def lowpass(signal: np.ndarray, cutoff: float) -> np.ndarray:
    spectrum = np.fft.rfft(signal)
    frequencies = np.fft.rfftfreq(signal.size, 1 / process.RATE)
    spectrum *= 1 / (1 + (frequencies / cutoff) ** 4)
    return np.fft.irfft(spectrum, signal.size)


def synth(kind: str) -> np.ndarray:
    soft = [1.0, 0.35, 0.12, 0.05]
    buzz = [1.0, 0.18, 0.45, 0.1, 0.25, 0.06, 0.14]
    harmonics = soft if kind == "soft" else buzz
    first = tone(196.0, 0.16, harmonics)
    second = tone(146.8, 0.30, harmonics)
    gap = int(process.RATE * 0.11)
    signal = np.zeros(gap + second.size)
    signal[: first.size] += first
    signal[gap:] += second
    signal = lowpass(signal, 1600 if kind == "soft" else 2600)
    return room(signal)[:, None].astype(np.float32)


def source(reference: str, downloads: Path, catalog: dict) -> tuple[np.ndarray | None, Path | None, dict]:
    kind, key = reference.split(":", 1)
    if kind == "synth":
        title = "Şimdiki sesin temiz hâli (yumuşak)" if key == "soft" else "Şimdiki sesin temiz hâli (vızıltılı)"
        return synth(key), None, {"source": "ChallengeGoal", "title": title, "author": "ChallengeGoal", "page": "", "license": "Kendi üretimimiz"}
    if kind == "fs":
        for group in ("freesound", "round2"):
            for entries in catalog.get(group, {}).values():
                for entry in entries:
                    if entry["id"] == int(key):
                        return None, downloads / entry["file"], {
                            "source": "Freesound",
                            "title": entry["title"],
                            "author": entry["user"],
                            "page": entry["page"],
                            "license": "CC0",
                        }
        raise KeyError(reference)
    pack, name = key.split("/", 1)
    return None, downloads / "kenney" / pack / "files" / name, {
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
        setting = SETTINGS[role]
        for offset, reference in enumerate(references):
            samples, path, info = source(reference, downloads, catalog)
            if samples is None:
                samples = process.decode(path, 1)
            length = setting["max"]
            start = process.active_start(samples)
            clip = process.shape(samples[start : start + int(process.RATE * length)].copy(), setting)
            clip, gain = process.normalize(clip, setting["target"], False)
            name = f"{role}-{chr(ord(FIRST_LETTER[role]) + offset)}"
            process.encode(clip, masters / role / f"{name}.wav", ["-c:a", "pcm_s16le"])
            process.encode(clip, audition / f"{name}.mp3", ["-c:a", "libmp3lame", "-b:a", "160k"])
            made.append(
                {
                    "role": role,
                    "name": name,
                    "round": 2,
                    "reference": reference,
                    "start": round(start / process.RATE, 2),
                    "duration": round(clip.shape[0] / process.RATE, 2),
                    "gain_db": gain,
                    **info,
                }
            )
            print(f"{name:10} {made[-1]['duration']:5.2f}s gain {gain:6.1f}  {info['title'][:52]}", flush=True)
    return made


if __name__ == "__main__":
    downloads, masters, audition = (Path(argument) for argument in sys.argv[1:4])
    made = build(downloads, masters, audition)
    (audition / "candidates-round2.json").write_text(json.dumps(made, indent=2, ensure_ascii=False), encoding="utf-8")
