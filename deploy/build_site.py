import hashlib
import html
import json
import os
import pathlib
import re
import subprocess

import localize

ROOT = pathlib.Path(__file__).resolve().parent
SOURCE = ROOT / "site-src"
SITE = ROOT / "site"
ORIGIN = "https://challengegoal.app"
PAGES = {"tr": "index.html", "en": "en.html", "de": "de.html", "es": "es.html", "fr": "fr.html", "it": "it.html"}
SCREEN_SETS = {"tr": "tr"}
DEFAULT_SCREEN_SET = "en"
SCRIPTS = ("site.js", "scene.js")
PLACEHOLDER = re.compile(r"\{\{(\w+)\}\}")


def read(name):
    return json.loads((SOURCE / name).read_text(encoding="utf-8"))


def bundle():
    esbuild = ROOT.parent / "node_modules" / ".bin" / ("esbuild.cmd" if os.name == "nt" else "esbuild")
    for name in SCRIPTS:
        subprocess.run(
            [str(esbuild), str(SOURCE / name), "--bundle", "--minify", "--format=esm", "--target=es2020", f"--outfile={SITE / name}"],
            check=True,
        )


def version():
    digest = hashlib.sha1()
    for name in ("site.css", *SCRIPTS):
        digest.update((SITE / name).read_bytes())
    return digest.hexdigest()[:10]


def credit(row, photo):
    license_name = html.escape(row["license"])
    license_link = (
        f'<a href="{html.escape(row["licenseUrl"])}" rel="license noopener">{license_name}</a>' if row["licenseUrl"] else license_name
    )
    return (
        f'<li>{html.escape(row["name"])}: <a href="{html.escape(row["sourceUrl"])}" rel="noopener">{photo}</a>, '
        f'{html.escape(row["author"])}, {license_link}</li>'
    )


def render(template, texts, cards, credits, stamp):
    values = dict(texts)
    closing = values["answer6End"]
    values["answer6End"] = closing if not closing[:1].isalnum() else f" {closing}"
    values["origin"] = ORIGIN
    values["version"] = stamp
    values["screens"] = SCREEN_SETS.get(texts["language"], DEFAULT_SCREEN_SET)
    values["credits"] = "".join(credit(row, texts["photoWord"]) for row in credits)
    scene = {
        "screens": values["screens"],
        "scene": f"/scene.js?v={stamp}",
        "cards": cards,
        "roles": {role: texts[f"role{role}"] for role in ("FW", "MF", "DF", "GK")},
    }
    values["sceneData"] = json.dumps(scene, ensure_ascii=False).replace("</", "<\\/")
    return PLACEHOLDER.sub(lambda match: values[match.group(1)], template)


def main():
    bundle()
    stamp = version()
    template = (SOURCE / "home.html").read_text(encoding="utf-8")
    texts = read("texts.json")
    cards = read("cards.json")
    credits = read("credits.json")
    for language, name in PAGES.items():
        (SITE / name).write_text(render(template, texts[language], cards, credits, stamp), encoding="utf-8", newline="\n")
    localize.main()
    print("site", stamp, {name: (SITE / name).stat().st_size for name in SCRIPTS})


if __name__ == "__main__":
    main()
