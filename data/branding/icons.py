import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

SCALE = 4
INK = (5, 7, 10)
VOLT = (200, 255, 46)
GOLD = [(255, 241, 194), (243, 198, 83), (168, 116, 26)]
BLUE = [(227, 238, 255), (91, 155, 255), (29, 63, 175)]
LEAN = math.radians(12)
ANGLES = [-math.pi / 2 + LEAN + index * 2 * math.pi / 5 for index in range(5)]


def radial(size, center, radius, stops):
    ys, xs = np.mgrid[0:size, 0:size].astype(np.float32)
    distance = np.clip(np.hypot(xs - center[0], ys - center[1]) / radius, 0, 1)
    positions = np.linspace(0, 1, len(stops))
    channels = [np.interp(distance, positions, [stop[channel] for stop in stops]) for channel in range(3)]
    return Image.fromarray(np.stack(channels, axis=-1).astype(np.uint8), 'RGB')


def pentagon(cx, cy, radius, turn=0.0):
    return [(cx + radius * math.cos(angle + turn), cy + radius * math.sin(angle + turn)) for angle in ANGLES]


def ball_layers(size, cx, cy, radius, tilt):
    circle = Image.new('L', (size, size), 0)
    ImageDraw.Draw(circle).ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=255)

    ys, xs = np.mgrid[0:size, 0:size].astype(np.float32)
    side = (xs - cx) * math.cos(tilt) + (ys - cy) * math.sin(tilt)
    left = Image.fromarray(((side < 0) * 255).astype(np.uint8), 'L')

    light = (cx - radius * 0.45, cy - radius * 0.55)
    gold = radial(size, light, radius * 1.9, GOLD)
    blue = radial(size, light, radius * 1.9, BLUE)
    fill = Image.composite(gold, blue, left)

    pattern = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(pattern)
    seam = max(2, int(radius * 0.075))
    draw.line(
        [
            (cx - radius * math.sin(tilt), cy + radius * math.cos(tilt)),
            (cx + radius * math.sin(tilt), cy - radius * math.cos(tilt)),
        ],
        fill=255,
        width=seam,
    )
    draw.polygon(pentagon(cx, cy, radius * 0.36), fill=255)
    for angle in ANGLES:
        draw.line(
            [
                (cx + radius * 0.34 * math.cos(angle), cy + radius * 0.34 * math.sin(angle)),
                (cx + radius * 0.74 * math.cos(angle), cy + radius * 0.74 * math.sin(angle)),
            ],
            fill=255,
            width=seam,
        )
        draw.polygon(
            pentagon(cx + radius * 0.98 * math.cos(angle), cy + radius * 0.98 * math.sin(angle), radius * 0.32, math.pi / 5),
            fill=255,
        )
    pattern = ImageChops.multiply(pattern, circle)
    shade = radial(size, (cx - radius * 0.35, cy - radius * 0.45), radius * 1.75, [(255, 255, 255), (255, 255, 255), (150, 150, 165)])
    fill = ImageChops.multiply(fill, shade)
    return circle, fill, pattern


def slash_mask(size, cx, cy, length, width, rise):
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    dx = length / 2 * math.cos(rise)
    dy = -length / 2 * math.sin(rise)
    draw.line([(cx - dx, cy - dy), (cx + dx, cy + dy)], fill=255, width=int(width))
    for px, py in [(cx - dx, cy - dy), (cx + dx, cy + dy)]:
        draw.ellipse([px - width / 2, py - width / 2, px + width / 2, py + width / 2], fill=255)
    return mask


def mark(size, ball_ratio, with_slash=True):
    big = size * SCALE
    cx = cy = big / 2
    radius = big * ball_ratio
    canvas = Image.new('RGBA', (big, big), (0, 0, 0, 0))

    if with_slash:
        slash = slash_mask(big, cx, cy + radius * 0.06, radius * 3.3, radius * 0.2, math.radians(14))
        glow = slash.filter(ImageFilter.GaussianBlur(radius * 0.12))
        canvas.paste(Image.new('RGBA', (big, big), VOLT + (255,)), (0, 0), glow.point(lambda value: int(value * 0.55)))
        canvas.paste(Image.new('RGBA', (big, big), VOLT + (255,)), (0, 0), slash)

    circle, fill, pattern = ball_layers(big, cx, cy, radius, LEAN)
    ring = Image.new('L', (big, big), 0)
    ImageDraw.Draw(ring).ellipse([cx - radius * 1.09, cy - radius * 1.09, cx + radius * 1.09, cy + radius * 1.09], fill=255)
    canvas.paste(Image.new('RGBA', (big, big), INK + (255,)), (0, 0), ring)
    canvas.paste(fill.convert('RGBA'), (0, 0), circle)
    canvas.paste(Image.new('RGBA', (big, big), INK + (255,)), (0, 0), pattern)

    return canvas.resize((size, size), Image.LANCZOS)


def background(size):
    big = size * SCALE
    image = radial(big, (big * 0.5, big * 0.42), big * 0.78, [(30, 42, 60), (12, 17, 26), INK])
    return image.resize((size, size), Image.LANCZOS).convert('RGBA')


def monochrome(size, ball_ratio):
    big = size * SCALE
    cx = cy = big / 2
    radius = big * ball_ratio
    circle, _, pattern = ball_layers(big, cx, cy, radius, LEAN)
    slash = slash_mask(big, cx, cy + radius * 0.06, radius * 3.3, radius * 0.2, math.radians(14))
    gap = Image.new('L', (big, big), 0)
    ImageDraw.Draw(gap).ellipse([cx - radius * 1.09, cy - radius * 1.09, cx + radius * 1.09, cy + radius * 1.09], fill=255)
    shape = ImageChops.subtract(slash, gap)
    shape = ImageChops.lighter(shape, ImageChops.subtract(circle, pattern))
    image = Image.new('RGBA', (big, big), (255, 255, 255, 0))
    image.putalpha(shape)
    return image.resize((size, size), Image.LANCZOS)


def main(out):
    out.mkdir(parents=True, exist_ok=True)
    icon = background(1024)
    icon.alpha_composite(mark(1024, 0.285))
    icon.convert('RGB').save(out / 'icon.png')
    background(1024).convert('RGB').save(out / 'android-icon-background.png')
    mark(1024, 0.19).save(out / 'android-icon-foreground.png')
    monochrome(1024, 0.19).save(out / 'android-icon-monochrome.png')
    mark(512, 0.3).save(out / 'splash-icon.png')
    icon.resize((48, 48), Image.LANCZOS).convert('RGB').save(out / 'favicon.png')
    preview = Image.new('RGB', (1024 + 512 + 256 + 96 + 60, 1024), (40, 40, 40))
    preview.paste(icon.convert('RGB'), (0, 0))
    offset = 1024 + 20
    for edge in (512, 256, 96, 48):
        preview.paste(icon.resize((edge, edge), Image.LANCZOS).convert('RGB'), (offset, 0 if edge == 512 else 532 if edge == 256 else 808 if edge == 96 else 924))
        offset += 0
    preview.save(out / 'preview.png')


if __name__ == '__main__':
    main(Path(sys.argv[1]))
