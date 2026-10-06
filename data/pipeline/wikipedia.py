import datetime
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from .config import CACHE_DIR, USER_AGENT

API_URL = "https://{language}.wikipedia.org/w/api.php"
WINDOW_DAYS = 60
BATCH_SIZE = 50
WORKERS = 1
BATCHES_PER_SAVE = 4
MAX_ATTEMPTS = 12
MAX_WAIT_SECONDS = 600


def request(language, parameters):
    body = urllib.parse.urlencode(parameters).encode("utf-8")
    for attempt in range(1, MAX_ATTEMPTS + 1):
        wait = min(MAX_WAIT_SECONDS, 15 * 2**attempt)
        try:
            call = urllib.request.Request(API_URL.format(language=language), data=body, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(call, timeout=120) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if attempt == MAX_ATTEMPTS:
                raise
            retry_after = error.headers.get("Retry-After", "")
            wait = min(MAX_WAIT_SECONDS, int(retry_after)) if retry_after.isdigit() else wait
        except (urllib.error.URLError, TimeoutError):
            if attempt == MAX_ATTEMPTS:
                raise
        time.sleep(wait)


def fetch_batch(language, titles):
    parameters = {
        "action": "query",
        "format": "json",
        "formatversion": "2",
        "prop": "pageviews",
        "pvipdays": str(WINDOW_DAYS),
        "titles": "|".join(titles),
    }
    views = {}
    renamed = {}
    continuation = {}
    while True:
        payload = request(language, {**parameters, **continuation})
        query = payload.get("query", {})
        for entry in query.get("normalized", []):
            renamed[entry["to"]] = entry["from"]
        for page in query.get("pages", []):
            if "pageviews" in page:
                title = renamed.get(page["title"], page["title"])
                views[title] = sum(count or 0 for count in page["pageviews"].values())
        if "continue" not in payload:
            break
        continuation = payload["continue"]
    return {title: views.get(title, 0) for title in titles}


def recent_views(language, titles, refresh=False):
    path = CACHE_DIR / "wikipedia" / f"pageviews-{language}-{datetime.date.today():%Y%m}.json"
    cached = {} if refresh or not path.exists() else json.loads(path.read_text(encoding="utf-8"))
    missing = sorted(set(titles) - set(cached))
    batches = [missing[offset : offset + BATCH_SIZE] for offset in range(0, len(missing), BATCH_SIZE)]
    path.parent.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        for index, batch in enumerate(pool.map(lambda titles: fetch_batch(language, titles), batches), start=1):
            cached.update(batch)
            if index % BATCHES_PER_SAVE == 0 or index == len(batches):
                path.write_text(json.dumps(cached, ensure_ascii=False), encoding="utf-8")
    return {title: cached[title] for title in titles}
