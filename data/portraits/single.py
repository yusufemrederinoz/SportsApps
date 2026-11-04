import json
import sys
import tempfile
from pathlib import Path

from .config import WORKING_SIZE
from .faces import examine, load_tools
from .matting import load_matting
from .stylize import WEBP_QUALITY, load_pipeline, portrait


def draw(source, output):
    from PIL import Image

    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as work:
        crop_file = Path(work) / "crop.jpg"
        cv2, numpy, detector = load_tools()
        entry = examine(cv2, numpy, detector, source, crop_file)
        if entry.get("status") != "cropped":
            return entry
        crop = Image.open(crop_file).convert("RGB").resize((WORKING_SIZE, WORKING_SIZE))
        result = portrait(load_pipeline(), load_matting(), crop, entry["face"])
    result.save(output, "WEBP", quality=WEBP_QUALITY, method=6)
    return entry


if __name__ == "__main__":
    print(json.dumps(draw(Path(sys.argv[1]), Path(sys.argv[2]))))
