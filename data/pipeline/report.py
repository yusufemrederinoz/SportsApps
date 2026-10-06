import sqlite3

from .config import DATABASE_PATH, DEFAULT_LANGUAGE, REPORT_PATH


def percent(part, whole):
    return f"{100 * part / whole:.1f}%" if whole else "n/a"


def table(headers, rows):
    lines = ["| " + " | ".join(headers) + " |", "|" + "|".join("---" for _ in headers) + "|"]
    lines += ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join(lines)


def write(dataset):
    stats = dataset["stats"]
    connection = sqlite3.connect(DATABASE_PATH)

    def scalar(query):
        return connection.execute(query).fetchone()[0]

    players = scalar("SELECT COUNT(*) FROM players")
    built_at = scalar("SELECT value FROM meta WHERE key = 'built_at'")
    sections = ["# Data build report", f"Built at: {built_at}"]

    totals = [
        ("Players", players),
        ("Clubs", scalar("SELECT COUNT(*) FROM clubs")),
        ("Player-club spells", scalar("SELECT COUNT(*) FROM player_clubs")),
        ("Searchable names", scalar("SELECT COUNT(*) FROM player_names")),
        ("Countries", scalar("SELECT COUNT(*) FROM countries")),
        ("Database size (MB)", f"{DATABASE_PATH.stat().st_size / 1_000_000:.1f}"),
    ]
    sections += ["## Totals", table(["Metric", "Value"], totals)]

    leagues = connection.execute(
        "SELECT l.name, COUNT(DISTINCT c.id), COUNT(DISTINCT pc.player_id) FROM leagues l "
        "JOIN clubs c ON c.league_code = l.code LEFT JOIN player_clubs pc ON pc.club_id = c.id "
        "GROUP BY l.code ORDER BY l.code"
    ).fetchall()
    sections += ["## Leagues", table(["League", "Clubs", "Players"], leagues)]

    sources = connection.execute("SELECT source, COUNT(*) FROM player_clubs GROUP BY source ORDER BY source").fetchall()
    sections += ["## Spell sources", table(["Source", "Spells"], sources)]

    linking = [
        ("Transfermarkt players in scope", stats["transfermarkt_players_in_scope"]),
        ("Wikidata players in scope", stats["wikidata_players_in_scope"]),
        ("Linked by Transfermarkt identifier", stats["linked_by_identifier"]),
        ("Linked by birth and name", stats["linked_by_birth_and_name"]),
        ("Transfermarkt only", stats["transfermarkt_only"]),
        ("Wikidata only", stats["wikidata_only"]),
        ("Dropped without a name", stats["players_without_name"]),
        ("Women excluded", stats["women_excluded"]),
        ("Unconfirmed current-year spells dropped", stats["rumor_spells_dropped"]),
    ]
    sections += ["## Player linking", table(["Metric", "Value"], linking)]

    coverage = [
        ("Birth date", scalar("SELECT COUNT(*) FROM players WHERE birth_date IS NOT NULL")),
        ("Position", scalar("SELECT COUNT(*) FROM players WHERE position IS NOT NULL")),
        ("Any nationality", scalar("SELECT COUNT(DISTINCT player_id) FROM player_countries")),
        ("Primary nationality", scalar("SELECT COUNT(DISTINCT player_id) FROM player_countries WHERE is_primary = 1")),
        ("Wikidata item", scalar("SELECT COUNT(*) FROM players WHERE wikidata_id IS NOT NULL")),
        ("Transfermarkt record", scalar("SELECT COUNT(*) FROM players WHERE transfermarkt_id IS NOT NULL")),
        ("Commons photo", scalar("SELECT COUNT(*) FROM players WHERE commons_file IS NOT NULL")),
        ("Spell with a start year", scalar("SELECT COUNT(DISTINCT player_id) FROM player_clubs WHERE first_year IS NOT NULL")),
    ]
    sections += ["## Field coverage", table(["Field", "Players", "Share"], [(name, count, percent(count, players)) for name, count in coverage])]

    fame_rows = connection.execute(
        "SELECT market, SUM(fame >= 80), SUM(fame >= 70), SUM(fame >= 60), SUM(fame >= 50), SUM(recent_views > 0) "
        "FROM player_fame GROUP BY market ORDER BY market"
    ).fetchall()
    sections += [
        "## Fame by market",
        table(["Market", "Fame 80+", "Fame 70+", "Fame 60+", "Fame 50+", "With recent local views"], fame_rows),
    ]

    grid_rows = [
        (
            summary["market"],
            summary["difficulty"],
            summary["grids"],
            summary["pool"],
            summary["headers_used"],
            f"{100 * summary['busiest_header_share']:.0f}%",
            summary["attempts"],
        )
        for summary in dataset.get("grid_summaries", [])
    ]
    sections += [
        "## Grids",
        table(["Market", "Difficulty", "Grids", "Header pool", "Headers used", "Busiest header share", "Attempts"], grid_rows),
    ]

    clubs = dataset["clubs"].values()
    unmatched = [(club["id"], club["transfermarkt_name"], club["league"]) for club in clubs if not club["wikidata_id"]]
    sections += ["## Clubs without a Wikidata item", table(["Transfermarkt id", "Name", "League"], unmatched) if unmatched else "None."]

    aliases = [
        (club["names"][DEFAULT_LANGUAGE], club["wikidata_id"], alias, members)
        for club in sorted(clubs, key=lambda item: item["names"][DEFAULT_LANGUAGE])
        for alias, members in club["aliases"]
    ]
    sections += [
        "## Wikidata aliases merged into clubs",
        table(["Club", "Canonical item", "Alias item", "Footballers on alias"], aliases) if aliases else "None.",
    ]

    unmapped = stats["unmapped_countries"]
    sections += [
        "## Transfermarkt citizenship values without a country",
        table(["Value", "Players"], unmapped) if unmapped else "None.",
    ]

    connection.close()
    REPORT_PATH.write_text("\n\n".join(sections) + "\n", encoding="utf-8")
    return REPORT_PATH
