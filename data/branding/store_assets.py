import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from icons import INK, VOLT, background, mark, radial

FONTS = Path(__file__).resolve().parents[2] / 'node_modules' / '@expo-google-fonts' / 'barlow-condensed'
DISPLAY_FONT = FONTS / '800ExtraBold_Italic' / 'BarlowCondensed_800ExtraBold_Italic.ttf'
LABEL_FONT = FONTS / '600SemiBold' / 'BarlowCondensed_600SemiBold.ttf'

PRODUCT_SIZE = 1024
BALL_RATIO = 0.45
BALL_SPAN = BALL_RATIO * 2 * 1.09
PACKS = {
    'goals_cg_30': [(0.5, 0.5, 0.6)],
    'goals_cg_100': [(0.35, 0.44, 0.42), (0.62, 0.57, 0.5)],
    'goals_cg_250': [(0.5, 0.33, 0.38), (0.31, 0.64, 0.42), (0.69, 0.64, 0.42)],
    'goals_cg_600': [(0.36, 0.35, 0.32), (0.64, 0.35, 0.32), (0.2, 0.66, 0.32), (0.8, 0.66, 0.32), (0.5, 0.67, 0.38)],
}
FEATURE_SIZE = (1024, 500)
FEATURE_MARGIN = 48
FEATURE_GAP = 18
WHITE = (246, 248, 251)
MUTED = (155, 168, 186)


def ball(diameter):
    edge = round(diameter / BALL_SPAN)
    return mark(edge, BALL_RATIO, with_slash=False)


def drop(canvas, sprite, center):
    left = round(center[0] - sprite.width / 2)
    top = round(center[1] - sprite.height / 2)
    shadow = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    offset = round(sprite.height * 0.05)
    shadow.paste(Image.new('RGBA', sprite.size, INK + (190,)), (left, top + offset), sprite.getchannel('A'))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(sprite.height * 0.04)))
    canvas.alpha_composite(sprite, (left, top))


def product(balls):
    canvas = background(PRODUCT_SIZE)
    for x, y, span in balls:
        drop(canvas, ball(span * PRODUCT_SIZE), (x * PRODUCT_SIZE, y * PRODUCT_SIZE))
    return canvas


def fitted(path, text, width, size):
    font = ImageFont.truetype(str(path), size)
    while font.getlength(text) > width:
        size -= 2
        font = ImageFont.truetype(str(path), size)
    return font


def feature(tagline):
    width, height = FEATURE_SIZE
    wide = radial(width, (width * 0.24, width * 0.2), width * 0.8, [(34, 48, 68), (12, 17, 26), INK])
    canvas = wide.crop((0, 0, width, height)).convert('RGBA')
    canvas.alpha_composite(mark(height, 0.23), (round(width * 0.21 - height / 2), 0))

    draw = ImageDraw.Draw(canvas)
    left = round(width * 0.43)
    room = width - left - FEATURE_MARGIN
    display = fitted(DISPLAY_FONT, 'CHALLENGE', room, 132)
    label = fitted(LABEL_FONT, tagline, room, 36)
    line = round(display.size * 0.9)
    top = round((height - (line * 2 + FEATURE_GAP + label.size)) / 2) - round(display.size * 0.12)
    draw.text((left, top), 'CHALLENGE', font=display, fill=WHITE)
    draw.text((left, top + line), 'GOAL', font=display, fill=VOLT)
    draw.text((left + 4, top + line * 2 + FEATURE_GAP + round(display.size * 0.12)), tagline, font=label, fill=MUTED)
    return canvas


def main(out):
    out.mkdir(parents=True, exist_ok=True)
    for product_id, balls in PACKS.items():
        product(balls).save(out / f'{product_id}.png')
    icon = background(512)
    icon.alpha_composite(mark(512, 0.285))
    icon.save(out / 'play-icon-512.png')
    feature('FUTBOL BİLGİ OYUNLARI').convert('RGB').save(out / 'play-feature-1024x500.png')


if __name__ == '__main__':
    main(Path(sys.argv[1]))
