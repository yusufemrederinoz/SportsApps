import json
import subprocess
import sys
from pathlib import Path

import numpy as np

RATE = 22050
WINDOW = 0.02


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(RATE), "-f", "f32le", "-"],
        capture_output=True,
        check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32)


def describe(samples: np.ndarray) -> dict:
    if samples.size == 0:
        return {"duration": 0}
    size = min(int(RATE * WINDOW), samples.size)
    frames = samples[: samples.size // size * size].reshape(-1, size)
    rms = np.sqrt(np.mean(frames**2, axis=1)) + 1e-9
    level = 20 * np.log10(rms)
    peak = 20 * np.log10(np.max(np.abs(samples)) + 1e-9)
    loud = level > peak - 30
    start = int(np.argmax(loud)) * WINDOW if loud.any() else 0
    end = (len(loud) - int(np.argmax(loud[::-1]))) * WINDOW if loud.any() else 0
    floor = float(np.percentile(level, 10))
    return {
        "duration": round(samples.size / RATE, 2),
        "peak_db": round(float(peak), 1),
        "active_start": round(start, 2),
        "active_end": round(end, 2),
        "noise_floor_db": round(floor, 1),
        "signal_to_floor": round(float(peak - floor), 1),
        "clipped": bool(np.mean(np.abs(samples) > 0.99) > 0.001),
        "level_spread_db": round(float(np.percentile(level, 90) - np.percentile(level, 10)), 1),
    }


if __name__ == "__main__":
    root = Path(sys.argv[1])
    catalog = json.loads((root / "catalog.json").read_text(encoding="utf-8"))
    report = {}
    for role, entries in catalog["freesound"].items():
        for entry in entries:
            info = describe(decode(root / entry["file"]))
            entry["analysis"] = info
            report.setdefault(role, []).append((entry["id"], entry["title"][:40], info))
    (root / "catalog.json").write_text(json.dumps(catalog, indent=2, ensure_ascii=False), encoding="utf-8")
    for role, rows in report.items():
        print("==", role)
        for sound_id, title, info in rows:
            print(
                f"  {sound_id:>7} {info['duration']:7.2f}s active {info['active_start']:.2f}-{info['active_end']:.2f} "
                f"peak {info['peak_db']:6.1f} floor {info['noise_floor_db']:6.1f} snr {info['signal_to_floor']:5.1f} "
                f"spread {info['level_spread_db']:5.1f} clip {int(info['clipped'])}  {title}"
            )
