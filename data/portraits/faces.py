import json
import sqlite3
import urllib.request

from pipeline.config import DATABASE_PATH, USER_AGENT

from .config import BACKDROP, CROP_DIR, MINIMUM_SOURCE_SIDE, MODEL_DIR, WORKING_SIZE
from .sources import fetch_large, large_source_path, load_metadata, source_path, target_players

DETECTOR_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
DETECTOR_PATH = MODEL_DIR / "face_detection_yunet_2023mar.onnx"
SCORE_THRESHOLD = 0.8
MINIMUM_FACE_WIDTH = 64
CROP_SCALE = 2.5
VERTICAL_SHIFT = 0.12
MINIMUM_CROP_SCALE = 1.9
TOP_MARGIN = 0.08
FACE_MARGIN = 0.05
SIDE_PADDING = 0.15
CENTER_DRIFT = 0.16
MINIMUM_EYE_SPAN = 0.14
NOSE_RANGE = (-0.3, 1.3)
RIVAL_SHARE = 0.55
DETECTION_SIDES = (480, 960, 0)
SAME_FACE_OVERLAP = 0.4
REPORT_PATH = CROP_DIR / "faces.json"


def largest_face(faces):
    usable = [face for face in faces if face["score"] >= SCORE_THRESHOLD and face["width"] >= MINIMUM_FACE_WIDTH]
    return max(usable, key=lambda face: face["width"] * face["height"], default=None)


def is_frontal(face):
    right, left, nose = face["right_eye"], face["left_eye"], face["nose"]
    span = left[0] - right[0]
    if abs(span) < face["width"] * MINIMUM_EYE_SPAN:
        return False
    return NOSE_RANGE[0] <= (nose[0] - right[0]) / span <= NOSE_RANGE[1]


def has_rival(face, faces, box):
    left, top, side = box
    for other in faces:
        center_x = other["x"] + other["width"] / 2
        center_y = other["y"] + other["height"] / 2
        inside = left <= center_x <= left + side and top <= center_y <= top + side
        if other is not face and inside and other["width"] >= face["width"] * RIVAL_SHARE:
            return True
    return False


def judge(faces, image_width, image_height):
    face = largest_face(faces)
    if not face:
        return "no_face", None, None
    if not is_frontal(face):
        return "turned", face, None
    if is_cut_off(face, image_width):
        return "tight", face, None
    box = portrait_box(face, image_width)
    if has_rival(face, faces, box):
        return "crowded", face, box
    return "cropped", face, box


def widest_side(face, image_width):
    center_x = face["x"] + face["width"] / 2
    reach = min(center_x, image_width - center_x)
    return min(reach / (0.5 - CENTER_DRIFT - SIDE_PADDING), image_width / (1 - 2 * SIDE_PADDING))


def is_cut_off(face, image_width):
    size = max(face["width"], face["height"])
    margin = face["width"] * FACE_MARGIN
    return (
        face["y"] - face["height"] * TOP_MARGIN < 0
        or face["x"] < margin
        or face["x"] + face["width"] > image_width - margin
        or widest_side(face, image_width) < size * MINIMUM_CROP_SCALE
    )


def portrait_box(face, image_width):
    size = max(face["width"], face["height"])
    side = min(size * CROP_SCALE, max(size * MINIMUM_CROP_SCALE, widest_side(face, image_width)))
    centered = face["x"] + face["width"] / 2 - side / 2
    spare = image_width - side
    inside = min(max(centered, 0.0), spare) if spare >= 0 else spare / 2
    drifted = min(max(inside, centered - side * CENTER_DRIFT), centered + side * CENTER_DRIFT)
    left = min(max(drifted, -side * SIDE_PADDING), spare + side * SIDE_PADDING)
    center_y = face["y"] + face["height"] / 2 + face["height"] * VERTICAL_SHIFT
    return int(round(left)), int(round(center_y - side / 2)), int(round(side))


def padded_crop(numpy, image, box):
    left, top, side = box
    height, width = image.shape[:2]
    canvas = numpy.empty((side, side, 3), dtype=numpy.uint8)
    canvas[:] = BACKDROP[::-1]
    source_left, source_top = max(0, left), max(0, top)
    source_right, source_bottom = min(width, left + side), min(height, top + side)
    canvas[source_top - top : source_bottom - top, source_left - left : source_right - left] = image[
        source_top:source_bottom, source_left:source_right
    ]
    return canvas


def crop_path(player_id):
    return CROP_DIR / f"{player_id}.png"


def detector_model():
    if not DETECTOR_PATH.exists():
        DETECTOR_PATH.parent.mkdir(parents=True, exist_ok=True)
        request = urllib.request.Request(DETECTOR_URL, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(request, timeout=120) as response:
            DETECTOR_PATH.write_bytes(response.read())
    return str(DETECTOR_PATH)


def overlap(first, second):
    left = max(first["x"], second["x"])
    top = max(first["y"], second["y"])
    right = min(first["x"] + first["width"], second["x"] + second["width"])
    bottom = min(first["y"] + first["height"], second["y"] + second["height"])
    shared = max(0.0, right - left) * max(0.0, bottom - top)
    total = first["width"] * first["height"] + second["width"] * second["height"] - shared
    return shared / total if total > 0 else 0.0


def distinct(faces):
    kept = []
    for face in sorted(faces, key=lambda candidate: candidate["score"], reverse=True):
        if all(overlap(face, other) < SAME_FACE_OVERLAP for other in kept):
            kept.append(face)
    return kept


def detect(detector, image):
    import cv2

    height, width = image.shape[:2]
    faces = []
    for limit in DETECTION_SIDES:
        scale = min(1.0, limit / max(width, height)) if limit else 1.0
        if scale == 1.0 and limit and faces:
            continue
        resized = (
            image
            if scale == 1.0
            else cv2.resize(image, (round(width * scale), round(height * scale)), interpolation=cv2.INTER_AREA)
        )
        detector.setInputSize((resized.shape[1], resized.shape[0]))
        _, found = detector.detect(resized)
        for row in found if found is not None else []:
            values = [float(value) / scale for value in row[:10]]
            faces.append(
                {
                    "x": values[0],
                    "y": values[1],
                    "width": values[2],
                    "height": values[3],
                    "right_eye": (values[4], values[5]),
                    "left_eye": (values[6], values[7]),
                    "nose": (values[8], values[9]),
                    "score": float(row[14]),
                }
            )
    return distinct(faces)


def needs_larger_source(entry):
    if not entry:
        return False
    return entry["status"] == "no_face" or (entry["status"] == "cropped" and entry["side"] < MINIMUM_SOURCE_SIDE)


def examine(cv2, numpy, detector, source, target):
    image = cv2.imdecode(numpy.frombuffer(source.read_bytes(), dtype=numpy.uint8), cv2.IMREAD_COLOR)
    if image is None:
        return {"status": "unreadable"}
    height, width = image.shape[:2]
    faces = detect(detector, image)
    status, face, box = judge(faces, width, height)
    if status != "cropped":
        target.unlink(missing_ok=True)
        return {"status": status, "faces": len(faces)}
    left, top, side = box
    crop = cv2.resize(
        padded_crop(numpy, image, box),
        (WORKING_SIZE, WORKING_SIZE),
        interpolation=cv2.INTER_AREA if side >= WORKING_SIZE else cv2.INTER_CUBIC,
    )
    cv2.imwrite(str(target), crop)
    scale = WORKING_SIZE / side
    return {
        "status": "cropped",
        "faces": len(faces),
        "side": side,
        "score": round(face["score"], 3),
        "face": [
            round((face["x"] - left) * scale),
            round((face["y"] - top) * scale),
            round(face["width"] * scale),
            round(face["height"] * scale),
        ],
    }


def load_tools():
    import cv2
    import numpy

    detector = cv2.FaceDetectorYN.create(detector_model(), "", (320, 320), SCORE_THRESHOLD, 0.3, 50)
    return cv2, numpy, detector


def load_report():
    return json.loads(REPORT_PATH.read_text(encoding="utf-8")) if REPORT_PATH.exists() else {}


def summarize(report, players):
    counts = {}
    for player in players:
        status = report.get(str(player["id"]), {}).get("status", "no_source")
        counts[status] = counts.get(status, 0) + 1
    return counts


def crop_all(limit=None):
    with sqlite3.connect(DATABASE_PATH) as connection:
        players = target_players(connection, limit)
    metadata = load_metadata()
    cv2, numpy, detector = load_tools()
    CROP_DIR.mkdir(parents=True, exist_ok=True)
    report = load_report()

    for player in players:
        key = str(player["id"])
        source = source_path(player["id"])
        if not (metadata.get(player["file"]) or {}).get("free") or not source.exists():
            continue
        if crop_path(player["id"]).exists() and report.get(key, {}).get("status") == "cropped":
            continue
        report[key] = examine(cv2, numpy, detector, source, crop_path(player["id"]))

    REPORT_PATH.write_text(json.dumps(report), encoding="utf-8")
    return summarize(report, players)


def enlarge(limit=None):
    with sqlite3.connect(DATABASE_PATH) as connection:
        players = target_players(connection, limit)
    report = load_report()
    small = [player for player in players if needs_larger_source(report.get(str(player["id"])))]
    fetched = fetch_large(small)
    cv2, numpy, detector = load_tools()
    improved = 0
    for player in small:
        key = str(player["id"])
        source = large_source_path(player["id"])
        if not source.exists():
            continue
        previous = report[key]
        result = examine(cv2, numpy, detector, source, crop_path(player["id"]))
        if result["status"] == "cropped" and result["side"] > previous.get("side", 0):
            report[key] = {**result, "large": True}
            improved += 1
        elif previous["status"] == "cropped":
            examine(cv2, numpy, detector, source_path(player["id"]), crop_path(player["id"]))
    REPORT_PATH.write_text(json.dumps(report), encoding="utf-8")
    return {**fetched, "improved": improved, **summarize(report, players)}
