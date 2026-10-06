import csv
import gzip
import shutil
import urllib.request

from .config import CACHE_DIR, TRANSFERMARKT_BASE_URL, USER_AGENT


def download(table, refresh=False):
    path = CACHE_DIR / "transfermarkt" / f"{table}.csv.gz"
    if path.exists() and not refresh:
        return path
    path.parent.mkdir(parents=True, exist_ok=True)
    partial = path.with_suffix(".partial")
    request = urllib.request.Request(f"{TRANSFERMARKT_BASE_URL}/{table}.csv.gz", headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=600) as response, open(partial, "wb") as target:
        shutil.copyfileobj(response, target)
    partial.replace(path)
    return path


def rows(table, refresh=False):
    with gzip.open(download(table, refresh), "rt", encoding="utf-8", newline="") as source:
        yield from csv.DictReader(source)
