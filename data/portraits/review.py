from .config import OUTPUT_DIR
from .faces import REPORT_PATH, SHARPNESS_SIDE, detect, load_report, load_tools

REJECTED_DIR = OUTPUT_DIR.parent / "portraits-rejected"
FACE_SCORE = 0.6
MINIMUM_SHARPNESS = 33
MINIMUM_COVERAGE = 0.25
MAXIMUM_COVERAGE = 0.62
ALPHA_FLOOR = 40
STRAY_AREA = 400
BACKDROP = 128


def verdict(measures):
    if measures["faces"] == 0:
        return "no_face"
    if measures["faces"] > 1 or measures["pieces"] > 1:
        return "crowded"
    if not MINIMUM_COVERAGE <= measures["coverage"] <= MAXIMUM_COVERAGE:
        return "shape"
    if measures["sharpness"] < MINIMUM_SHARPNESS:
        return "blurry"
    return None


def measure(cv2, numpy, detector, path):
    image = cv2.imdecode(numpy.fromfile(str(path), dtype=numpy.uint8), cv2.IMREAD_UNCHANGED)
    alpha = image[..., 3]
    mask = alpha > ALPHA_FLOOR
    count, _, stats, _ = cv2.connectedComponentsWithStats(mask.astype(numpy.uint8), 8)
    pieces = sum(1 for index in range(1, count) if stats[index, cv2.CC_STAT_AREA] > STRAY_AREA)
    weight = (alpha.astype(numpy.float32) / 255.0)[..., None]
    flat = (image[..., :3].astype(numpy.float32) * weight + BACKDROP * (1 - weight)).astype(numpy.uint8)
    found = [face for face in detect(detector, flat) if face["score"] >= FACE_SCORE]
    largest = max(found, key=lambda face: face["width"] * face["height"], default=None)
    sharpness = 0.0
    if largest:
        left, top = max(0, int(largest["x"])), max(0, int(largest["y"]))
        region = flat[top : top + int(largest["height"]), left : left + int(largest["width"])]
        if region.size:
            gray = cv2.cvtColor(cv2.resize(region, (SHARPNESS_SIDE, SHARPNESS_SIDE), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)
            sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    return {"faces": len(found), "pieces": pieces, "coverage": float(mask.mean()), "sharpness": sharpness}


def run():
    import json

    cv2, numpy, detector = load_tools()
    report = load_report()
    counts = {"kept": 0}
    REJECTED_DIR.mkdir(parents=True, exist_ok=True)
    for path in sorted(OUTPUT_DIR.glob("*.webp")):
        reason = verdict(measure(cv2, numpy, detector, path))
        if reason is None:
            counts["kept"] += 1
            continue
        path.replace(REJECTED_DIR / path.name)
        report[path.stem] = {**report.get(path.stem, {}), "status": "rejected", "reason": reason}
        counts[reason] = counts.get(reason, 0) + 1
    REPORT_PATH.write_text(json.dumps(report), encoding="utf-8")
    return counts
