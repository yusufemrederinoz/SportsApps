import bz2
import datetime
import json

from .config import CACHE_DIR

DUMP_URL = "https://dumps.wikimedia.org/other/pageview_complete/monthly/{year}/{year}-{month}/pageviews-{year}{month}-user.bz2"
TITLE_FIELD = 1
TOTAL_FIELD = 4


def dump_path(month):
    return CACHE_DIR / "wikipedia" / f"pageviews-{month.replace('-', '')}-user.bz2"


def cache_path(language):
    return CACHE_DIR / "wikipedia" / f"pageviews-{language}-{datetime.date.today():%Y%m}.json"


def monthly_views(path, titles_by_language):
    wanted = {
        f"{language}.wikipedia".encode(): {title.replace(" ", "_").encode("utf-8"): title for title in titles}
        for language, titles in titles_by_language.items()
    }
    views = {code: dict.fromkeys(titles.values(), 0) for code, titles in wanted.items()}
    last = max(wanted)
    with bz2.open(path, "rb") as source:
        for line in source:
            code, _, rest = line.partition(b" ")
            titles = wanted.get(code)
            if titles is None:
                if code > last:
                    break
                continue
            fields = rest.split(b" ")
            name = titles.get(fields[TITLE_FIELD - 1])
            if name is not None and fields[TOTAL_FIELD - 1].isdigit():
                views[code][name] += int(fields[TOTAL_FIELD - 1])
    return {code.decode().split(".")[0]: counts for code, counts in views.items()}


def write_caches(month, titles_by_language):
    counted = monthly_views(dump_path(month), titles_by_language)
    summary = {}
    for language, views in counted.items():
        path = cache_path(language)
        known = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
        path.write_text(json.dumps({**known, **views}, ensure_ascii=False), encoding="utf-8")
        summary[language] = {"titles": len(views), "with_views": sum(1 for count in views.values() if count > 0)}
    return summary
