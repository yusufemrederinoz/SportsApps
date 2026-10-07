import json
import sqlite3
import urllib.request

from pipeline.config import DATABASE_PATH, USER_AGENT

from .config import CROP_DIR, MINIMUM_SOURCE_SIDE, MODEL_DIR, WORKING_SIZE
from .sources import fetch_large, large_source_path, load_metadata, source_path, target_players

DETECTOR_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
DETECTOR_PATH = MODEL_DIR / "face_detection_yunet_2023mar.onnx"
SCORE_THRESHOLD = 0.8
MINIMUM_FACE_WIDTH = 64
CROP_SCALE = 2.5
VERTICAL_SHIFT = 0.12
MINIMUM_CONTEXT = 1.6
MINIMUM_EYE_SPAN = 0.22
NOSE_RANGE = (0.02, 0.98)
RIVAL_SHARE = 0.55
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
    box = portrait_box(face, image_width, image_height)
    if box[2] < max(face["width"], face["height"]) * MINIMUM_CONTEXT:
        return "tight", face, box
    if has_rival(face, faces, box):
        return "crowded", face, box
    return "cropped", face, box


def portrait_box(face, image_width, image_height):
    side = min(max(face["width"], face["height"]) * CROP_SCALE, image_width, image_height)
    center_x = face["x"] + face["width"] / 2
    center_y = face["y"] + face["height"] / 2 + face["height"] * VERTICAL_SHIFT
    left = min(max(0.0, center_x - side / 2), image_width - side)
    top = min(max(0.0, center_y - side / 2), image_height - side)
    return int(round(left)), int(round(top)), int(side)


def crop_path(player_id):
    return CROP_DIR / f"{player_id}.png"


def detector_model():
    if not DETECTOR_PATH.exists():
        DETECTOR_PATH.parent.mkdir(parents=True, exist_ok=True)
        request = urllib.request.Request(DETECTOR_URL, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(request, timeout=120) as response:
            DETECTOR_PATH.write_bytes(response.read())
    return str(DETECTOR_PATH)


def detect(detector, image):
    height, width = image.shape[:2]
    detector.setInputSize((width, height))
    _, found = detector.detect(image)
    return [
        {
            "x": float(row[0]),
            "y": float(row[1]),
            "width": float(row[2]),
            "height": float(row[3]),
            "right_eye": (float(row[4]), float(row[5])),
            "left_eye": (float(row[6]), float(row[7])),
            "nose": (float(row[8]), float(row[9])),
            "score": float(row[14]),
        }
        for row in (found if found is not None else [])
    ]


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
        image[top : top + side, left : left + side],
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
