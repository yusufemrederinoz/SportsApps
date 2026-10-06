from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT / ".cache"
BUILD_DIR = ROOT / "build"
OVERRIDES_DIR = ROOT / "overrides"
DATABASE_PATH = BUILD_DIR / "football.sqlite"
REPORT_PATH = BUILD_DIR / "report.md"

TRANSFERMARKT_BASE_URL = "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data"
WIKIDATA_SPARQL_URL = "https://qlever.dev/api/wikidata"
USER_AGENT = "SportAppsDataPipeline/0.1 (football trivia dataset build)"

TRANSFERMARKT_POSITIONS = {"Goalkeeper": "GK", "Defender": "DF", "Midfield": "MF", "Attack": "FW"}
TRANSFERMARKT_ONLY_ID_OFFSET = 1_000_000_000
