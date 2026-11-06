import json
import re
import sqlite3
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATABASE = ROOT / 'app' / 'assets' / 'data' / 'football.db'
OUTPUT = Path(__file__).resolve().parent / 'questions.json'
CLUB_NAMES = {
    'Galatasaray': 'GALATASARAY',
    'Fenerbahçe': 'FENERBAHÇE',
    'Beşiktaş': 'BEŞİKTAŞ',
    'Trabzonspor': 'TRABZONSPOR',
    'Real Madrid CF': 'REAL MADRID',
    'FC Barcelona': 'BARCELONA',
    'FC Bayern Münih': 'BAYERN MÜNİH',
    'Liverpool FC': 'LIVERPOOL',
    'Manchester United FC': 'MANCHESTER UNITED',
    'Juventus FC': 'JUVENTUS',
    'FC Internazionale Milano': 'INTER',
    'A.C. Milan': 'MILAN',
    'Paris Saint-Germain': 'PSG',
    'Chelsea FC': 'CHELSEA',
    'Arsenal FC': 'ARSENAL',
}
COUNTRY_CODES = ['BR', 'AR', 'FR', 'NL', 'PT', 'DE', 'ES', 'IT', 'NG', 'SN', 'CM', 'UY', 'BE', 'HR', 'TR', 'CI', 'GH', 'CO']
HOME_COUNTRY = {
    'GALATASARAY': 'TR',
    'FENERBAHÇE': 'TR',
    'BEŞİKTAŞ': 'TR',
    'TRABZONSPOR': 'TR',
    'REAL MADRID': 'ES',
    'BARCELONA': 'ES',
    'BAYERN MÜNİH': 'DE',
    'LIVERPOOL': 'GB-ENG',
    'MANCHESTER UNITED': 'GB-ENG',
    'JUVENTUS': 'IT',
    'INTER': 'IT',
    'MILAN': 'IT',
    'PSG': 'FR',
    'CHELSEA': 'GB-ENG',
    'ARSENAL': 'GB-ENG',
}
HIDDEN_FROM_REVEAL = {'Hakan Şükür', 'Fatih Terim', 'Arda Turan', 'Emre Belözoğlu', 'Nicolas Anelka', 'Daniel Sturridge', 'Mario Balotelli'}
MINIMUM_FAME = 45
MINIMUM_FAMOUS = 4
REVEAL = 3
SHORTEST_KEY = 4


def turkish_upper(text):
    return text.replace('i', 'İ').upper()


def plain(text):
    folded = text.replace('ı', 'i').replace('İ', 'i').lower()
    return ''.join(character for character in unicodedata.normalize('NFKD', folded) if not unicodedata.combining(character))


def keys(name):
    words = [word for word in re.split(r'[^0-9a-z]+', plain(name)) if word]
    found = {' '.join(words)}
    if len(words) == 1 or len(words[-1]) >= SHORTEST_KEY:
        found.add(words[-1])
    return sorted(found)


def main():
    connection = sqlite3.connect(DATABASE)
    clubs = []
    for name, label in CLUB_NAMES.items():
        row = connection.execute("SELECT club_id FROM club_names WHERE language = 'tr' AND name = ?", (name,)).fetchone()
        if row is None:
            raise SystemExit(f'missing club {name}')
        clubs.append((row[0], label))
    countries = connection.execute(
        f"""SELECT c.id, c.code, n.name FROM countries c JOIN country_names n ON n.country_id = c.id AND n.language = 'tr'
            WHERE c.code IN ({','.join('?' * len(COUNTRY_CODES))})""",
        COUNTRY_CODES,
    ).fetchall()
    questions = []
    for club_id, club_name in clubs:
        for country_id, code, country_name in countries:
            if code == HOME_COUNTRY[club_name]:
                continue
            players = connection.execute(
                """SELECT p.name, COALESCE(f.fame, 0) FROM players p
                   JOIN player_clubs pc ON pc.player_id = p.id AND pc.club_id = ?
                   LEFT JOIN player_fame f ON f.player_id = p.id AND f.market = 'tr'
                   WHERE p.country_id = ? ORDER BY COALESCE(f.fame, 0) DESC""",
                (club_id, country_id),
            ).fetchall()
            famous = [name for name, fame in players if fame >= MINIMUM_FAME and name not in HIDDEN_FROM_REVEAL]
            if len(famous) < MINIMUM_FAMOUS:
                continue
            answers = {}
            for name, _ in players:
                for key in keys(name):
                    answers.setdefault(key, name)
            questions.append(
                {
                    'club': club_name,
                    'country': turkish_upper(country_name),
                    'code': code,
                    'reveal': famous[:REVEAL],
                    'answers': answers,
                }
            )
    OUTPUT.write_text(json.dumps({'questions': questions}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')
    print('questions', len(questions))


if __name__ == '__main__':
    main()
