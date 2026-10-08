import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw

SCALE = 4
INK = (5, 7, 10)
VOLT = (200, 255, 46)
ARTWORK_DIR = Path(__file__).resolve().parent / 'artwork'
ARTWORK_PATH = ARTWORK_DIR / 'emblem.png'
BALL_PATH = ARTWORK_DIR / 'ball.png'
RING_CENTER = (577.5, 556.9)
RING_RADIUS = 184
ICON_RING = 0.61
ICON_CENTER = (0.542, 0.586)
ADAPTIVE_RING = 0.47
ADAPTIVE_CENTER = (0.525, 0.53)
FITTED_RING = 0.66
FITTED_CENTER = (0.568, 0.637)
SILHOUETTE_LUMINANCE = 120


def radial(size, center, radius, stops):
    ys, xs = np.mgrid[0:size, 0:size].astype(np.float32)
    distance = np.clip(np.hypot(xs - center[0], ys - center[1]) / radius, 0, 1)
    positions = np.linspace(0, 1, len(stops))
    channels = [np.interp(distance, positions, [stop[channel] for stop in stops]) for channel in range(3)]
    return Image.fromarray(np.stack(channels, axis=-1).astype(np.uint8), 'RGB')


def background(size):
    big = size * SCALE
    image = radial(big, (big * 0.5, big * 0.42), big * 0.78, [(30, 42, 60), (12, 17, 26), INK])
    return image.resize((size, size), Image.LANCZOS).convert('RGBA')


def emblem(size, ring_ratio, center=(0.5, 0.5)):
    artwork = Image.open(ARTWORK_PATH).convert('RGBA')
    scale = size * ring_ratio / 2 / RING_RADIUS
    scaled = artwork.resize((round(artwork.width * scale), round(artwork.height * scale)), Image.LANCZOS)
    layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    layer.paste(scaled, (round(size * center[0] - RING_CENTER[0] * scale), round(size * center[1] - RING_CENTER[1] * scale)))
    return layer


def ball(diameter):
    edge = round(diameter)
    return Image.open(BALL_PATH).convert('RGBA').resize((edge, edge), Image.LANCZOS)


def app_icon(size):
    icon = background(size)
    icon.alpha_composite(emblem(size, ICON_RING, ICON_CENTER))
    return icon


def fitted_emblem(size):
    return emblem(size, FITTED_RING, FITTED_CENTER)


def silhouette(layer):
    bright = layer.convert('L').point(lambda value: 255 if value > SILHOUETTE_LUMINANCE else 0)
    image = Image.new('RGBA', layer.size, (255, 255, 255, 0))
    image.putalpha(ImageChops.multiply(bright, layer.getchannel('A')))
    return image


def masked(image, shape):
    edge = image.width
    mask = Image.new('L', (edge * SCALE, edge * SCALE), 0)
    draw = ImageDraw.Draw(mask)
    if shape == 'circle':
        draw.ellipse([0, 0, edge * SCALE, edge * SCALE], fill=255)
    else:
        draw.rounded_rectangle([0, 0, edge * SCALE, edge * SCALE], radius=edge * SCALE * 0.225, fill=255)
    result = image.convert('RGBA')
    result.putalpha(mask.resize((edge, edge), Image.LANCZOS))
    return result


def preview(icon, foreground, themed):
    sheet = Image.new('RGBA', (1720, 820), (58, 62, 70, 255))
    sheet.alpha_composite(masked(icon.resize((512, 512), Image.LANCZOS), 'rounded'), (40, 40))
    visible = round(1024 * 72 / 108)
    inset = (1024 - visible) // 2
    adaptive = background(1024)
    adaptive.alpha_composite(foreground)
    adaptive = adaptive.crop((inset, inset, inset + visible, inset + visible)).resize((512, 512), Image.LANCZOS)
    sheet.alpha_composite(masked(adaptive, 'circle'), (600, 40))
    tinted = Image.new('RGBA', (1024, 1024), (26, 54, 46, 255))
    tinted.paste(Image.new('RGBA', (1024, 1024), (160, 232, 200, 255)), (0, 0), themed.getchannel('A'))
    tinted = tinted.crop((inset, inset, inset + visible, inset + visible)).resize((512, 512), Image.LANCZOS)
    sheet.alpha_composite(masked(tinted, 'circle'), (1160, 40))
    offset = 40
    for edge in (180, 120, 96, 60, 48):
        sheet.alpha_composite(masked(icon.resize((edge, edge), Image.LANCZOS), 'rounded'), (offset, 700 - edge // 2))
        offset += edge + 30
    return sheet.convert('RGB')


def main(out):
    out.mkdir(parents=True, exist_ok=True)
    icon = app_icon(1024)
    foreground = emblem(1024, ADAPTIVE_RING, ADAPTIVE_CENTER)
    themed = silhouette(foreground)
    icon.convert('RGB').save(out / 'icon.png')
    background(1024).convert('RGB').save(out / 'android-icon-background.png')
    foreground.save(out / 'android-icon-foreground.png')
    themed.save(out / 'android-icon-monochrome.png')
    fitted_emblem(512).save(out / 'splash-icon.png')
    icon.resize((48, 48), Image.LANCZOS).convert('RGB').save(out / 'favicon.png')
    preview(icon, foreground, themed).save(out / 'preview.png')


if __name__ == '__main__':
    main(Path(sys.argv[1]))
