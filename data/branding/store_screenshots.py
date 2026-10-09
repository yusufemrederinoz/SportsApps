import json
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
FONTS = ROOT / "deploy" / "site" / "fonts"
RAW = ROOT / "data" / "build" / "store" / "raw"
OUT = ROOT / "data" / "build" / "store" / "screenshots"
CAPTIONS = json.loads((HERE / "store_captions.json").read_text(encoding="utf-8"))
ORDER = ("home", "puzzle", "duel", "auction", "chain")
SCREEN_CROP = (0, 124, 1080, 2330)
LAYOUTS = {
    "play": {"size": (1080, 1920), "title": 112, "subtitle": 40, "top": 92, "screen_top": 350, "bottom": 46},
    "appstore": {"size": (1290, 2796), "title": 150, "subtitle": 54, "top": 150, "screen_top": 520, "bottom": 70},
}
INK = (5, 7, 10)
SKY = (15, 20, 28)
VOLT = (200, 255, 46)
BLUE = (91, 155, 255)
BODY = (213, 219, 229)
FRAME = (91, 107, 128)
SIDE_MARGIN = 60
CORNER_SHARE = 0.06
FRAME_WIDTH = 4
SHADOW_BLUR = 44
GRADIENT_EDGE = 181


def font(name, size):
    return ImageFont.truetype(str(FONTS / name), size)


def glow(size, center, radius, colour, strength):
    width, height = size
    spot = Image.radial_gradient("L").point(lambda value: 255 - min(255, round(value * 255 / GRADIENT_EDGE)))
    spot = spot.resize((radius[0] * 2, radius[1] * 2))
    mask = Image.new("L", size, 0)
    mask.paste(spot, (center[0] - radius[0], center[1] - radius[1]))
    mask = mask.point(lambda value: int(value * strength))
    return Image.new("RGB", (width, height), colour), mask


def backdrop(size):
    width, height = size
    ramp = Image.linear_gradient("L").resize(size)
    image = Image.composite(Image.new("RGB", size, INK), Image.new("RGB", size, SKY), ramp)
    for center, radius, colour, strength in (
        ((width // 2, 0), (int(width * 0.9), int(height * 0.3)), VOLT, 0.3),
        ((width, height), (int(width * 0.8), int(height * 0.34)), BLUE, 0.26),
    ):
        layer, mask = glow(size, center, radius, colour, strength)
        image.paste(layer, (0, 0), mask)
    return image


def fitted(text, name, size, limit):
    while size > 20:
        candidate = font(name, size)
        if candidate.getlength(text) <= limit:
            return candidate
        size -= 2
    return font(name, size)


def rounded(size, radius):
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius, fill=255)
    return mask


def compose(language, key, store):
    layout = LAYOUTS[store]
    width, height = layout["size"]
    title, subtitle = CAPTIONS[language][key]
    image = backdrop((width, height))
    draw = ImageDraw.Draw(image)
    limit = width - 2 * SIDE_MARGIN
    title_font = fitted(title, "BarlowCondensed_800ExtraBold_Italic.ttf", layout["title"], limit)
    subtitle_font = fitted(subtitle, "Barlow_500Medium.ttf", layout["subtitle"], limit)
    draw.text((width / 2, layout["top"]), title, font=title_font, fill=VOLT, anchor="ma")
    title_bottom = layout["top"] + title_font.getbbox(title)[3]
    draw.text((width / 2, title_bottom + layout["subtitle"] * 0.55), subtitle, font=subtitle_font, fill=BODY, anchor="ma")

    screen = Image.open(RAW / language / f"{key}.png").convert("RGB").crop(SCREEN_CROP)
    screen_height = height - layout["screen_top"] - layout["bottom"]
    screen_width = round(screen.width * screen_height / screen.height)
    screen = screen.resize((screen_width, screen_height), Image.LANCZOS)
    left = (width - screen_width) // 2
    top = layout["screen_top"]
    radius = round(screen_width * CORNER_SHARE)
    mask = rounded(screen.size, radius)

    shadow = Image.new("L", (width, height), 0)
    shadow.paste(mask, (left, top + 18))
    shadow = shadow.filter(ImageFilter.GaussianBlur(SHADOW_BLUR)).point(lambda value: int(value * 0.75))
    image.paste(Image.new("RGB", (width, height), (0, 0, 0)), (0, 0), shadow)
    image.paste(screen, (left, top), mask)
    ImageDraw.Draw(image).rounded_rectangle(
        (left, top, left + screen_width - 1, top + screen_height - 1), radius, outline=FRAME, width=FRAME_WIDTH
    )
    return image


def main():
    languages = sys.argv[1:] or sorted(CAPTIONS)
    for language in languages:
        for store in LAYOUTS:
            folder = OUT / language / store
            folder.mkdir(parents=True, exist_ok=True)
            for index, key in enumerate(ORDER, start=1):
                path = folder / f"{index:02d}-{key}.png"
                compose(language, key, store).save(path, optimize=True)
                print(path.relative_to(ROOT))


if __name__ == "__main__":
    main()
