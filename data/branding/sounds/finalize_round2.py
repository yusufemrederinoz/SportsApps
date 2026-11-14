import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import process

masters = Path(sys.argv[1])
sounds = Path(sys.argv[2])

wrong = process.decode(sounds / "wrong.wav", 1)
wrong, gain = process.normalize(wrong, -20, False)
process.encode(wrong, sounds / "wrong.wav", ["-c:a", "pcm_s16le"])
print("wrong gain", gain)

kick = masters / "impact" / "impact-a.wav"
process.encode(process.decode(kick, 1), sounds / "impact.wav", ["-c:a", "pcm_s16le"])
for name, ratio in (("impact-2.wav", 0.96), ("impact-3.wav", 1.04)):
    subprocess.run(
        [
            "ffmpeg", "-v", "error", "-y", "-i", str(kick),
            "-af", f"asetrate={int(process.RATE * ratio)},aresample={process.RATE}",
            "-ac", "1", "-c:a", "pcm_s16le", str(sounds / name),
        ],
        check=True,
    )
    print(name, ratio)
