import json
import sqlite3
import sys
import time

from PIL import Image

from pipeline.config import DATABASE_PATH

from .config import REVIEW_DIR, WORKING_SIZE
from .faces import REPORT_PATH, crop_path
from .matting import load_matting, subject_mask
from .sources import target_players
from .stylize import clean_source, load_pipeline, portrait, usable

VARIANTS = ((0.32, 0.9),)
TILE = 224
CARD_COLORS = ((255, 241, 194), (243, 198, 83), (168, 116, 26))


def card_backdrop(size):
    backdrop = Image.new("RGB", (size, size))
    pixels = backdrop.load()
    for y in range(size):
        for x in range(size):
            position = min(1.0, (x * 0.5 + y) / (size * 1.5))
            first, second = (CARD_COLORS[0], CARD_COLORS[1]) if position < 0.42 else (CARD_COLORS[1], CARD_COLORS[2])
            local = position / 0.42 if position < 0.42 else (position - 0.42) / 0.58
            pixels[x, y] = tuple(int(first[index] + (second[index] - first[index]) * local) for index in range(3))
    return backdrop


def main(count, offset):
    with sqlite3.connect(DATABASE_PATH) as connection:
        players = target_players(connection, 400)
    report = json.loads(REPORT_PATH.read_text(encoding="utf-8"))
    cropped = [player for player in players if usable(report.get(str(player["id"])))]
    chosen = cropped[offset : offset + count]
    pipeline = load_pipeline()
    matting = load_matting()
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    backdrop = card_backdrop(TILE)
    sheet = Image.new("RGB", (TILE * (len(VARIANTS) + 2), TILE * len(chosen)), "black")
    started = time.time()
    for row, player in enumerate(chosen):
        face = report[str(player["id"])]["face"]
        crop = Image.open(crop_path(player["id"])).convert("RGB").resize((WORKING_SIZE, WORKING_SIZE))
        sheet.paste(crop.resize((TILE, TILE)), (0, row * TILE))
        sheet.paste(clean_source(crop, subject_mask(matting, crop), face).resize((TILE, TILE)), (TILE, row * TILE))
        for column, (strength, control_scale) in enumerate(VARIANTS, start=2):
            result = portrait(pipeline, matting, crop, face, strength, control_scale).resize((TILE, TILE), Image.LANCZOS)
            tile = backdrop.copy()
            tile.paste(result, (0, 0), result)
            sheet.paste(tile, (column * TILE, row * TILE))
    sheet.save(REVIEW_DIR / f"pilot-sheet-{offset}.jpg", quality=88)
    seconds = (time.time() - started) / (len(chosen) * len(VARIANTS))
    print(f"seconds per image: {seconds:.2f}")
    print(REVIEW_DIR / f"pilot-sheet-{offset}.jpg")


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 6, int(sys.argv[2]) if len(sys.argv) > 2 else 0)
