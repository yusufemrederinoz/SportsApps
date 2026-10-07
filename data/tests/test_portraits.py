import sqlite3
import unittest

from pipeline.config import APP_DATABASE_PATH, DATABASE_PATH
from portraits.config import OUTPUT_DIR
from portraits.faces import (
    MINIMUM_FACE_WIDTH,
    distinct,
    has_rival,
    is_cut_off,
    is_frontal,
    judge,
    largest_face,
    portrait_box,
)
from portraits.sources import artist_name, describe, is_free_license


def face(x=400, y=300, width=200, height=240, score=0.95, turn=0.5):
    return {
        "x": x,
        "y": y,
        "width": width,
        "height": height,
        "score": score,
        "right_eye": (x + width * 0.3, y + height * 0.4),
        "left_eye": (x + width * 0.7, y + height * 0.4),
        "nose": (x + width * (0.3 + 0.4 * turn), y + height * 0.6),
    }


class LicenseTest(unittest.TestCase):
    def test_accepts_licenses_that_allow_changed_copies(self):
        for name in ("CC BY-SA 4.0", "CC BY 2.0", "CC BY-SA 3.0 de", "CC0", "Public domain", "cc-by-sa-2.5"):
            self.assertTrue(is_free_license(name), name)

    def test_rejects_restricted_or_unknown_licenses(self):
        for name in ("CC BY-NC 2.0", "CC BY-ND 4.0", "CC BY-NC-SA 3.0", "GFDL", "Copyrighted", "", None):
            self.assertFalse(is_free_license(name), name)

    def test_reads_author_names_out_of_markup(self):
        self.assertEqual(artist_name('<a href="//commons.wikimedia.org/wiki/User:A">Ay&#351;e K.</a>'), "Ayşe K.")
        self.assertEqual(artist_name("  Kremlin.ru\n"), "Kremlin.ru")
        self.assertLessEqual(len(artist_name("x" * 400)), 120)

    def test_describes_a_usable_photo(self):
        info = {
            "thumburl": "https://example.org/thumb.jpg",
            "descriptionurl": "https://commons.wikimedia.org/wiki/File:A.jpg",
            "width": 2000,
            "height": 3000,
            "mime": "image/jpeg",
            "extmetadata": {
                "LicenseShortName": {"value": "CC BY-SA 4.0"},
                "LicenseUrl": {"value": "https://creativecommons.org/licenses/by-sa/4.0"},
                "Artist": {"value": "<b>Someone</b>"},
            },
        }
        described = describe(info)
        self.assertTrue(described["free"])
        self.assertEqual(described["artist"], "Someone")
        self.assertFalse(describe({**info, "mime": "image/svg+xml"})["free"])


class FaceTest(unittest.TestCase):
    def test_picks_the_largest_confident_face(self):
        small = face(width=90, height=100)
        large = face(x=100, width=220, height=260)
        unsure = face(width=400, height=400, score=0.4)
        tiny = face(width=MINIMUM_FACE_WIDTH - 1, height=40)
        self.assertIs(largest_face([small, large, unsure, tiny]), large)
        self.assertIsNone(largest_face([unsure, tiny]))

    def test_frames_the_head_with_room_for_shoulders(self):
        left, top, side = portrait_box(face(), 1280)
        self.assertEqual(side, 600)
        self.assertEqual(left, 200)
        self.assertAlmostEqual(top + side / 2, 300 + 120 + 240 * 0.12, delta=1)

    def test_narrows_the_frame_when_the_photo_is_not_wide_enough(self):
        narrow = face(x=90, y=300, width=200, height=240)
        left, _, side = portrait_box(narrow, 380)
        self.assertLess(side, 600)
        self.assertGreaterEqual(side, 240 * 1.9)
        self.assertGreaterEqual(left, -side * 0.15 - 1)
        self.assertLessEqual(left + side, 380 + side * 0.15 + 1)

    def test_slides_the_frame_into_the_photo_for_a_player_near_the_edge(self):
        near_edge = face(x=140, y=300, width=200, height=240)
        left, _, side = portrait_box(near_edge, 2000)
        self.assertEqual(side, 600)
        self.assertEqual(left, 0)
        drift = abs((140 + 100) - (left + side / 2)) / side
        self.assertLessEqual(drift, 0.16)

    def test_rejects_a_head_that_the_photo_cuts_off(self):
        self.assertFalse(is_cut_off(face(), 1280))
        self.assertFalse(is_cut_off(face(x=140), 2000))
        self.assertTrue(is_cut_off(face(y=10), 1280))
        self.assertTrue(is_cut_off(face(x=5), 1280))
        self.assertTrue(is_cut_off(face(x=1075), 1280))
        self.assertTrue(is_cut_off(face(x=30, width=200, height=240), 260))

    def test_keeps_one_box_for_a_face_found_at_two_scales(self):
        first = face(score=0.95)
        again = face(x=404, y=296, score=0.85)
        other = face(x=900, y=300, score=0.9)
        self.assertEqual(distinct([again, first, other]), [first, other])

    def test_tells_a_frontal_face_from_a_profile(self):
        self.assertTrue(is_frontal(face()))
        self.assertFalse(is_frontal(face(turn=1.5)))
        narrow = face()
        narrow["left_eye"] = (narrow["right_eye"][0] + 10, narrow["left_eye"][1])
        self.assertFalse(is_frontal(narrow))

    def test_notices_a_second_person_inside_the_frame(self):
        main = face()
        box = portrait_box(main, 1280)
        self.assertTrue(has_rival(main, [main, face(x=560, y=320, width=150, height=180)], box))
        self.assertFalse(has_rival(main, [main, face(x=560, y=320, width=60, height=70)], box))
        self.assertFalse(has_rival(main, [main, face(x=1100, y=1300, width=160, height=180)], box))

    def test_judges_each_kind_of_source_photo(self):
        self.assertEqual(judge([], 1280, 1600)[0], "no_face")
        self.assertEqual(judge([face(turn=1.6)], 1280, 1600)[0], "turned")
        self.assertEqual(judge([face(x=0, y=0, width=400, height=480)], 600, 700)[0], "tight")
        self.assertEqual(judge([face(x=220, y=200, width=400, height=480)], 840, 1000)[0], "cropped")
        main = face()
        self.assertEqual(judge([main, face(x=560, y=320, width=150, height=180)], 1280, 1600)[0], "crowded")
        status, chosen, box = judge([main], 1280, 1600)
        self.assertEqual((status, chosen), ("cropped", main))
        self.assertEqual(len(box), 3)


class PublishedPortraitsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not DATABASE_PATH.exists() or not APP_DATABASE_PATH.exists():
            raise unittest.SkipTest("databases have not been built")
        cls.full = sqlite3.connect(DATABASE_PATH)
        cls.app = sqlite3.connect(APP_DATABASE_PATH)
        if not cls.full.execute("SELECT 1 FROM sqlite_master WHERE name = 'player_portraits'").fetchone():
            raise unittest.SkipTest("portraits have not been published")

    @classmethod
    def tearDownClass(cls):
        cls.full.close()
        cls.app.close()

    def test_every_credit_names_a_free_license_and_a_source(self):
        for player_id, author, license_name, source_url in self.app.execute(
            "SELECT player_id, author, license, source_url FROM player_portraits"
        ):
            self.assertTrue(author, player_id)
            self.assertTrue(is_free_license(license_name), (player_id, license_name))
            self.assertTrue(source_url.startswith("https://commons.wikimedia.org/"), (player_id, source_url))

    def test_every_credit_belongs_to_a_player_in_the_app(self):
        orphans = self.app.execute(
            "SELECT COUNT(*) FROM player_portraits WHERE player_id NOT IN (SELECT id FROM players)"
        ).fetchone()[0]
        self.assertEqual(orphans, 0)

    def test_app_database_lists_the_same_portraits_as_the_full_one(self):
        full = {row[0] for row in self.full.execute("SELECT player_id FROM player_portraits")}
        app = {row[0] for row in self.app.execute("SELECT player_id FROM player_portraits")}
        self.assertTrue(app <= full)

    def test_every_listed_portrait_has_an_image_file(self):
        if not OUTPUT_DIR.exists():
            self.skipTest("portrait images are not on this machine")
        for (player_id,) in self.app.execute("SELECT player_id FROM player_portraits"):
            self.assertTrue((OUTPUT_DIR / f"{player_id}.webp").exists(), player_id)
