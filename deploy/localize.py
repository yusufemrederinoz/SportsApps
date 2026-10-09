import pathlib
import re

SITE = pathlib.Path(__file__).resolve().parent / "site"
ORIGIN = "https://challengegoal.app"
LANGUAGES = {"tr": "Türkçe", "en": "English", "de": "Deutsch", "es": "Español", "fr": "Français", "it": "Italiano"}
DEFAULT_LANGUAGE = "en"
HOME = {"tr": "/"}
LEGAL = {
    "privacy": {"tr": "/gizlilik"},
    "terms": {"tr": "/kosullar"},
    "delete-account": {"tr": "/hesap-silme"},
}
MENU_LABEL = {"tr": "Dil", "en": "Language", "de": "Sprache", "es": "Idioma", "fr": "Langue", "it": "Lingua"}
ALTERNATE = re.compile(r'\n\s*<link rel="alternate" hreflang="[^"]*" href="[^"]*" />')
MENU = re.compile(r'\n\s*<details class="languages">.*?</details>', re.DOTALL)
CANONICAL = re.compile(r'<link rel="canonical" href="[^"]*" />')
SHARED_URL = re.compile(r'<meta property="og:url" content="[^"]*" />')
SWITCH = re.compile(r'\n(\s*)<a class="language" href="[^"]*" lang="[^"]*" hreflang="[^"]*">[^<]*</a>')
HEAD_ANCHOR = '    <link rel="icon" type="image/png" href="/img/favicon.png" />'
NAV_END = "      </nav>\n    </header>"


def address(page, language):
    if page == "home":
        return HOME.get(language, f"/{language}")
    return LEGAL[page].get(language, f"/{language}/{page}")


def source(page, language):
    path = address(page, language)
    return SITE / ("index.html" if path == "/" else f"{path.strip('/')}.html")


def alternates(page, available):
    rows = [f'    <link rel="alternate" hreflang="{language}" href="{ORIGIN}{address(page, language)}" />' for language in available]
    fallback = DEFAULT_LANGUAGE if DEFAULT_LANGUAGE in available else available[0]
    rows.append(f'    <link rel="alternate" hreflang="x-default" href="{ORIGIN}{address(page, fallback)}" />')
    return "\n".join(rows)


def menu(page, current, available):
    links = "".join(
        f'<a href="{address(page, language)}" lang="{language}" hreflang="{language}">{LANGUAGES[language]}</a>'
        for language in available
        if language != current
    )
    return (
        f'        <details class="languages"><summary aria-label="{MENU_LABEL[current]}">{current.upper()}</summary>'
        f"<div>{links}</div></details>"
    )


def localize(page, language, available):
    path = source(page, language)
    text = path.read_text(encoding="utf-8")
    text = ALTERNATE.sub("", text)
    text = MENU.sub("", text)
    text = SWITCH.sub("", text)
    own = ORIGIN + address(page, language)
    text = CANONICAL.sub(f'<link rel="canonical" href="{own}" />', text)
    text = SHARED_URL.sub(f'<meta property="og:url" content="{own}" />', text)
    assert text.count(HEAD_ANCHOR) == 1, path
    text = text.replace(HEAD_ANCHOR, alternates(page, available) + "\n" + HEAD_ANCHOR, 1)
    assert text.count(NAV_END) == 1, path
    text = text.replace(NAV_END, menu(page, language, available) + "\n" + NAV_END, 1)
    path.write_text(text, encoding="utf-8", newline="\n")


def main():
    for page in ("home", *LEGAL):
        available = [language for language in LANGUAGES if source(page, language).exists()]
        for language in available:
            localize(page, language, available)
        print(page, available)


if __name__ == "__main__":
    main()
