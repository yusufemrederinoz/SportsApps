import json
import sqlite3

from pipeline.config import DATABASE_PATH

from .config import BACKDROP, MINIMUM_SOURCE_SIDE, MODEL_DIR, OUTPUT_DIR, PORTRAIT_SIZE, WORKING_SIZE
from .faces import REPORT_PATH, crop_path
from .sources import target_players

BASE_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"
CONTROL_MODEL = "diffusers/controlnet-canny-sdxl-1.0"
VAE_MODEL = "madebyollin/sdxl-vae-fp16-fix"
LOCAL_BASE = MODEL_DIR / "sdxl-base"
LOCAL_VAE = MODEL_DIR / "sdxl-vae"

PROMPT = (
    "realistic digital painting portrait of a football player, head and neck, soft even studio lighting, "
    "natural skin tones, clean smooth shading, sharp facial features, plain dark studio background, highly detailed"
)
NEGATIVE_PROMPT = (
    "cartoon, comic, cel shading, ink outlines, anime, caricature, 3d render, blurry, noisy, text, letters, numbers, "
    "logo, badge, crest, sponsor, watermark, signature, frame, border, deformed face, extra eyes, asymmetric eyes, "
    "bad anatomy, hands"
)

STRENGTH = 0.32
CONTROL_SCALE = 0.9
GUIDANCE = 6.5
STEPS = 24
SEED = 1905
CANNY_LOW = 60
CANNY_HIGH = 150
HEAD_SCALE_X = 1.7
HEAD_SCALE_Y = 2.1
CLOTHING_BLUR = 22
MINIMUM_CLOTHING_PIXELS = 2000
FEATHER = 12
CHIN_OFFSET = 1.08
WEBP_QUALITY = 84
EYE_LEVEL = 0.42
MOUTH_LEVEL = 0.74
CHIN_LEVEL = 1.03
HEAD_WIDTH_AT_EYES = 1.2
HEAD_WIDTH_AT_MOUTH = 0.66
HEAD_WIDTH_AT_CHIN = 0.46
NECK_DEPTH = 0.12
EDGE_SOFTNESS = 0.05
HEAD_FILL = 0.9
VISIBLE_ALPHA = 24


def output_path(player_id):
    return OUTPUT_DIR / f"{player_id}.webp"


def head_ellipse(face, size):
    x, y, width, height = face
    center = (int(x + width / 2), int(y + height / 2 - height * 0.08))
    axes = (int(min(size, width * HEAD_SCALE_X) / 2), int(min(size, height * HEAD_SCALE_Y) / 2))
    return center, axes


def head_mask(face, size):
    import cv2
    import numpy

    mask = numpy.zeros((size, size), dtype=numpy.uint8)
    center, axes = head_ellipse(face, size)
    cv2.ellipse(mask, center, axes, 0, 0, 360, 255, -1)
    return mask


def control_image(crop, face):
    import cv2
    import numpy
    from PIL import Image

    pixels = numpy.array(crop.convert("RGB"))
    edges = cv2.Canny(cv2.cvtColor(pixels, cv2.COLOR_RGB2GRAY), CANNY_LOW, CANNY_HIGH)
    return Image.fromarray(numpy.stack([cv2.bitwise_and(edges, head_mask(face, edges.shape[0]))] * 3, axis=-1))


def clean_source(crop, subject, face):
    import cv2
    import numpy
    from PIL import Image

    pixels = numpy.array(crop.convert("RGB")).astype(numpy.float32)
    size = pixels.shape[0]
    presence = numpy.array(subject.convert("L")).astype(numpy.float32) / 255
    chin = face[1] + face[3] * CHIN_OFFSET
    above_chin = numpy.clip((chin - numpy.arange(size, dtype=numpy.float32)[:, None]) / FEATHER + 0.5, 0, 1)
    head = numpy.maximum(
        cv2.GaussianBlur(head_mask(face, size), (0, 0), FEATHER).astype(numpy.float32) / 255,
        numpy.broadcast_to(above_chin, (size, size)),
    )
    clothing = (presence > 0.5) & (head < 0.2)
    tone = numpy.median(pixels[clothing], axis=0) if clothing.sum() > MINIMUM_CLOTHING_PIXELS else pixels.mean(axis=(0, 1))
    shaded = cv2.GaussianBlur(pixels, (0, 0), CLOTHING_BLUR).mean(axis=2, keepdims=True) / 255
    plain = tone * (0.75 + 0.5 * shaded)
    figure = pixels * head[..., None] + plain * (1 - head[..., None])
    backdrop = numpy.array(BACKDROP, dtype=numpy.float32)
    blended = figure * presence[..., None] + backdrop * (1 - presence[..., None])
    return Image.fromarray(blended.clip(0, 255).astype(numpy.uint8))


def cut_out(portrait, subject, face):
    from PIL import Image

    cutout = portrait.convert("RGBA")
    cutout.putalpha(subject.convert("L"))
    centered = Image.new("RGBA", cutout.size, (0, 0, 0, 0))
    centered.paste(cutout, (round(cutout.width / 2 - (face[0] + face[2] / 2)), 0))
    return centered


def head_only(cutout, face):
    import cv2
    import numpy
    from PIL import Image

    size = cutout.width
    _, top, width, height = face
    center = size / 2
    levels = [top + height * EYE_LEVEL, top + height * MOUTH_LEVEL, top + height * CHIN_LEVEL]
    chin = levels[-1]
    rows, columns = numpy.mgrid[0:size, 0:size].astype(numpy.float32)
    offset = numpy.abs(columns - center)
    half = numpy.interp(
        rows, levels, [width * HEAD_WIDTH_AT_EYES, width * HEAD_WIDTH_AT_MOUTH, width * HEAD_WIDTH_AT_CHIN]
    )
    head = numpy.clip((half - offset) / (width * EDGE_SOFTNESS) + 0.5, 0, 1)
    neck = numpy.clip(
        (1 - (offset / (width * HEAD_WIDTH_AT_CHIN)) ** 2 - ((rows - chin) / (height * NECK_DEPTH)) ** 2) * 5, 0, 1
    )
    keep = numpy.where(rows <= chin, head, neck)
    pixels = numpy.array(cutout)
    pixels[..., 3] = (pixels[..., 3].astype(numpy.float32) * keep).astype(numpy.uint8)
    _, pieces = cv2.connectedComponents((pixels[..., 3] > VISIBLE_ALPHA).astype(numpy.uint8))
    core = pieces[min(size - 1, int(top + height / 2)), int(center)]
    if core:
        pixels[..., 3] = numpy.where(pieces == core, pixels[..., 3], 0)
    head = Image.fromarray(pixels, "RGBA")
    box = head.getchannel("A").point(lambda value: 255 if value > VISIBLE_ALPHA else 0).getbbox()
    canvas = Image.new("RGBA", (PORTRAIT_SIZE, PORTRAIT_SIZE), (0, 0, 0, 0))
    if not box:
        return canvas
    trimmed = head.crop(box)
    scale = PORTRAIT_SIZE * HEAD_FILL / max(trimmed.size)
    resized = trimmed.resize((max(1, round(trimmed.width * scale)), max(1, round(trimmed.height * scale))), Image.LANCZOS)
    canvas.paste(resized, ((PORTRAIT_SIZE - resized.width) // 2, (PORTRAIT_SIZE - resized.height) // 2))
    return canvas


def load_pipeline():
    import torch
    from diffusers import (
        AutoencoderKL,
        ControlNetModel,
        DPMSolverMultistepScheduler,
        StableDiffusionXLControlNetImg2ImgPipeline,
    )

    controlnet = ControlNetModel.from_pretrained(CONTROL_MODEL, torch_dtype=torch.float16, variant="fp16")
    vae = AutoencoderKL.from_pretrained(str(LOCAL_VAE) if LOCAL_VAE.exists() else VAE_MODEL, torch_dtype=torch.float16)
    pipeline = StableDiffusionXLControlNetImg2ImgPipeline.from_pretrained(
        str(LOCAL_BASE) if LOCAL_BASE.exists() else BASE_MODEL,
        controlnet=controlnet,
        vae=vae,
        torch_dtype=torch.float16,
        variant="fp16",
        use_safetensors=True,
    )
    pipeline.scheduler = DPMSolverMultistepScheduler.from_config(pipeline.scheduler.config, use_karras_sigmas=True)
    pipeline.set_progress_bar_config(disable=True)
    return pipeline.to("cuda")


def stylize(pipeline, source, control, strength=STRENGTH, control_scale=CONTROL_SCALE, seed=SEED):
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
        generator=torch.Generator("cuda").manual_seed(seed),
    ).images[0]


def portrait(pipeline, matting, crop, face, strength=STRENGTH, control_scale=CONTROL_SCALE):
    from .matting import subject_mask

    source = clean_source(crop, subject_mask(matting, crop), face)
    drawn = stylize(pipeline, source, control_image(crop, face), strength, control_scale)
    return head_only(cut_out(drawn, subject_mask(matting, drawn), face), face)


def usable(entry):
    return bool(entry) and entry.get("status") == "cropped" and entry.get("side", 0) >= MINIMUM_SOURCE_SIDE


def run(limit=None):
    from PIL import Image

    from .matting import load_matting

    with sqlite3.connect(DATABASE_PATH) as connection:
        players = target_players(connection, limit)
    report = json.loads(REPORT_PATH.read_text(encoding="utf-8")) if REPORT_PATH.exists() else {}
    pending = [
        player
        for player in players
        if usable(report.get(str(player["id"]))) and not output_path(player["id"]).exists()
    ]
    stale = [player for player in players if not usable(report.get(str(player["id"])))]
    for player in stale:
        output_path(player["id"]).unlink(missing_ok=True)
    counts = {"ready": len(players) - len(pending) - len(stale), "skipped": len(stale), "made": 0}
    if not pending:
        return counts
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    pipeline = load_pipeline()
    matting = load_matting()
    counts["failed"] = 0
    for player in pending:
        try:
            crop = Image.open(crop_path(player["id"])).convert("RGB").resize((WORKING_SIZE, WORKING_SIZE))
            result = portrait(pipeline, matting, crop, report[str(player["id"])]["face"])
            result.save(output_path(player["id"]), "WEBP", quality=WEBP_QUALITY, method=6)
            counts["made"] += 1
        except (OSError, RuntimeError, ValueError) as error:
            counts["failed"] += 1
            print(f"failed {player['id']}: {error}")
    return counts
