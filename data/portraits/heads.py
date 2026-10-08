import json
import sys
import time

from .config import PORTRAIT_SIZE, REVIEW_DIR, WORKING_SIZE
from .faces import REPORT_PATH, crop_path
from .stylize import GUIDANCE, SEED, STEPS, clean_source, control_image, cut_out, load_pipeline, output_path

PROMPT = (
    "realistic digital painting portrait of a football player, head and neck, soft even studio lighting, "
    "natural skin tones, clean smooth shading, sharp facial features, plain dark studio background, highly detailed"
)
NEGATIVE_PROMPT = (
    "cartoon, comic, cel shading, ink outlines, anime, caricature, 3d render, blurry, noisy, text, letters, numbers, "
    "logo, badge, crest, sponsor, watermark, signature, frame, border, deformed face, extra eyes, asymmetric eyes, "
    "bad anatomy, hands"
)
VARIANTS = (("painted", 0.5, 0.9), ("faithful", 0.32, 0.9))
MOUTH_LEVEL = 0.74
CHIN_LEVEL = 1.03
JAW_WIDTH_AT_MOUTH = 0.95
JAW_WIDTH_AT_CHIN = 0.5
NECK_DEPTH = 0.2
EDGE_SOFTNESS = 0.05
HEAD_FILL = 0.9
TILE = 256
TILE_BACKGROUND = (18, 24, 33)
DISC = (236, 239, 244)


def render(pipeline, source, control, strength, control_scale):
    import torch

    return pipeline(
        prompt=PROMPT,
        negative_prompt=NEGATIVE_PROMPT,
        image=source,
        control_image=control,
        strength=strength,
        controlnet_conditioning_scale=control_scale,
        guidance_scale=GUIDANCE,
        num_inference_steps=STEPS,
        generator=torch.Generator("cuda").manual_seed(SEED),
    ).images[0]


def head_only(cutout, face):
    import numpy
    from PIL import Image

    size = cutout.width
    _, top, width, height = face
    center = size / 2
    mouth = top + height * MOUTH_LEVEL
    chin = top + height * CHIN_LEVEL
    rows, columns = numpy.mgrid[0:size, 0:size].astype(numpy.float32)
    offset = numpy.abs(columns - center)
    jaw_half = numpy.interp(rows, [mouth, chin], [width * JAW_WIDTH_AT_MOUTH, width * JAW_WIDTH_AT_CHIN])
    jaw = numpy.clip((jaw_half - offset) / (width * EDGE_SOFTNESS) + 0.5, 0, 1)
    neck = numpy.clip(
        (1 - (offset / (width * JAW_WIDTH_AT_CHIN)) ** 2 - ((rows - chin) / (height * NECK_DEPTH)) ** 2) * 5, 0, 1
    )
    keep = numpy.where(rows <= mouth, 1.0, numpy.where(rows <= chin, jaw, neck))
    pixels = numpy.array(cutout)
    pixels[..., 3] = (pixels[..., 3].astype(numpy.float32) * keep).astype(numpy.uint8)
    head = Image.fromarray(pixels, "RGBA")
    box = head.getchannel("A").point(lambda value: 255 if value > 24 else 0).getbbox()
    if not box:
        return head.resize((PORTRAIT_SIZE, PORTRAIT_SIZE), Image.LANCZOS)
    trimmed = head.crop(box)
    scale = PORTRAIT_SIZE * HEAD_FILL / max(trimmed.size)
    resized = trimmed.resize((max(1, round(trimmed.width * scale)), max(1, round(trimmed.height * scale))), Image.LANCZOS)
    canvas = Image.new("RGBA", (PORTRAIT_SIZE, PORTRAIT_SIZE), (0, 0, 0, 0))
    canvas.paste(resized, ((PORTRAIT_SIZE - resized.width) // 2, (PORTRAIT_SIZE - resized.height) // 2))
    return canvas


def head_portrait(pipeline, matting, crop, face, strength, control_scale):
    from .matting import subject_mask

    source = clean_source(crop, subject_mask(matting, crop), face)
    drawn = render(pipeline, source, control_image(crop, face), strength, control_scale)
    return head_only(cut_out(drawn, subject_mask(matting, drawn), face), face)


def on_disc(image):
    from PIL import Image, ImageDraw

    tile = Image.new("RGB", (TILE, TILE), TILE_BACKGROUND)
    margin = TILE // 16
    ImageDraw.Draw(tile).ellipse([margin, margin, TILE - margin, TILE - margin], fill=DISC)
    fitted = image.resize((TILE - margin * 3, TILE - margin * 3), Image.LANCZOS)
    tile.paste(fitted, ((TILE - fitted.width) // 2, (TILE - fitted.height) // 2), fitted)
    return tile


def main(player_ids):
    from PIL import Image

    from .matting import load_matting

    report = json.loads(REPORT_PATH.read_text(encoding="utf-8"))
    pipeline = load_pipeline()
    matting = load_matting()
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGB", (TILE * (len(VARIANTS) + 2), TILE * len(player_ids)), TILE_BACKGROUND)
    started = time.time()
    for row, player_id in enumerate(player_ids):
        face = report[str(player_id)]["face"]
        crop = Image.open(crop_path(player_id)).convert("RGB").resize((WORKING_SIZE, WORKING_SIZE))
        sheet.paste(crop.resize((TILE, TILE)), (0, row * TILE))
        current = output_path(player_id)
        if current.exists():
            sheet.paste(on_disc(Image.open(current).convert("RGBA")), (TILE, row * TILE))
        for column, (name, strength, control_scale) in enumerate(VARIANTS, start=2):
            head = head_portrait(pipeline, matting, crop, face, strength, control_scale)
            head.save(REVIEW_DIR / f"head-{player_id}-{name}.png")
            sheet.paste(on_disc(head), (column * TILE, row * TILE))
    target = REVIEW_DIR / "head-pilot.jpg"
    sheet.save(target, quality=90)
    print(f"seconds per image: {(time.time() - started) / (len(player_ids) * len(VARIANTS)):.2f}")
    print(target)


if __name__ == "__main__":
    main([int(value) for value in sys.argv[1:]])
