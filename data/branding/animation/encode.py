import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent / 'build' / 'animation' / 'frames'
ARTWORK = HERE.parent / 'artwork'
ALPHA_FLOOR = 6


def frames_of(name):
    return [Image.open(path).convert('RGBA') for path in sorted((ROOT / name).glob('*.png'))]


def union_box(frames):
    box = None
    for frame in frames:
        found = frame.getchannel('A').point(lambda value: 255 if value > ALPHA_FLOOR else 0).getbbox()
        if found:
            box = found if box is None else (min(box[0], found[0]), min(box[1], found[1]), max(box[2], found[2]), max(box[3], found[3]))
    return box


def padded(box, size, ratio):
    pad = round(max(box[2] - box[0], box[3] - box[1]) * ratio)
    return (max(0, box[0] - pad), max(0, box[1] - pad), min(size[0], box[2] + pad), min(size[1], box[3] + pad))


def durations(total, count):
    edges = [round(total * index / count) for index in range(count + 1)]
    return [edges[index + 1] - edges[index] for index in range(count)]


def encode(name, target, width, total, quality=70, alpha_quality=60, pad=0.03):
    frames = frames_of(name)
    box = padded(union_box(frames), frames[0].size, pad)
    height = round(width * (box[3] - box[1]) / (box[2] - box[0]))
    sized = [frame.crop(box).resize((width, height), Image.LANCZOS) for frame in frames]
    target.parent.mkdir(parents=True, exist_ok=True)
    sized[0].save(
        target,
        save_all=True,
        append_images=sized[1:],
        duration=durations(total, len(sized)),
        loop=0,
        quality=quality,
        alpha_quality=alpha_quality,
        method=6,
        minimize_size=True,
    )
    written = Image.open(target)
    assert written.n_frames == len(sized), (written.n_frames, len(sized))
    print(f'{name}: {width}x{height}, {written.n_frames} frames, {target.stat().st_size / 1024:.0f} KB -> {target}')
    return sized


def still(name, target, edge):
    image = Image.open(ROOT / name / '0000.png').convert('RGBA')
    box = image.getchannel('A').point(lambda value: 255 if value > ALPHA_FLOOR else 0).getbbox()
    half = max(box[2] - box[0], box[3] - box[1]) * 0.51
    cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
    square = image.crop((round(cx - half), round(cy - half), round(cx + half), round(cy + half)))
    target.parent.mkdir(parents=True, exist_ok=True)
    square.resize((edge, edge), Image.LANCZOS).save(target, optimize=True)
    print(f'{name}: {edge}x{edge}, {target.stat().st_size / 1024:.0f} KB -> {target}')


def main():
    app = Path(sys.argv[1])
    site = Path(sys.argv[2])
    spin = 2 * 3.141592653589793 / 0.0012
    encode('gol', app / 'animations' / 'goal-win.webp', 600, 2600)
    encode('kupa', app / 'animations' / 'trophy-loss.webp', 600, 3200)
    flame = encode('alev', site / 'flame.webp', 160, round(spin), quality=72, pad=0.02)
    flame[0].save(site / 'flame.png', optimize=True)
    still('ball', app / 'images' / 'goal-ball.png', 384)
    still('ball-plain', app / 'images' / 'goal-ball-plain.png', 160)
    still('ball', ARTWORK / 'ball.png', 1024)


if __name__ == "__main__":
    main()
