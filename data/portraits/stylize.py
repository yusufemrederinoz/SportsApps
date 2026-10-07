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
    "comic book portrait illustration of a football player, head and shoulders, bold clean ink outlines, "
    "cel shading, flat vivid colors, strong jawline, dramatic rim light, plain dark navy studio background, "
    "plain unbranded sports shirt, sports trading card art, sharp, highly detailed"
)
NEGATIVE_PROMPT = (
    "photo, photograph, photorealistic, realistic skin texture, 3d render, blurry, noisy, text, letters, numbers, "
    "logo, badge, crest, sponsor, watermark, signature, frame, border, crowd, stadium, deformed face, extra eyes, "
    "asymmetric eyes, bad anatomy, hands"
)

STRENGTH = 0.66
CONTROL_SCALE = 0.8
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
    return cut_out(drawn, subject_mask(matting, drawn), face)


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
    for player in pending:
        crop = Image.open(crop_path(player["id"])).convert("RGB").resize((WORKING_SIZE, WORKING_SIZE))
        result = portrait(pipeline, matting, crop, report[str(player["id"])]["face"])
        result.resize((PORTRAIT_SIZE, PORTRAIT_SIZE), Image.LANCZOS).save(
            output_path(player["id"]), "WEBP", quality=WEBP_QUALITY, method=6
        )
        counts["made"] += 1
    return counts
