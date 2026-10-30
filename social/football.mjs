import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const DATABASE = new URL('../app/assets/data/football.db', import.meta.url);
const CLUBS = JSON.parse(readFileSync(new URL('./club-aliases.json', import.meta.url), 'utf8'));
const EXCLUDED = new Set(JSON.parse(readFileSync(new URL('./excluded-players.json', import.meta.url), 'utf8')));
const CLUB_NOISE = new Set(['fc', 'cf', 'afc', 'ac', 'as', 'ss', 'sc', 'sk', 'jk', 'ssc', 'club', 'de', 'futbol', 'football', 'calcio', 'spor', 'kulubu', 's', 'k', 'j', 'f', 'c', 'a', 'istanbul']);
const DISPLAY_NOISE = new Set(['fc', 'cf', 'afc', 'ac', 'as', 'ss', 'ssc', 'sl', 'sk', 'jk', 'fk', 'sfc', 'cp', 'sc', 'osc', 'ogc', 'rcd', 'kvc', 'ud', 'cd', 'sd', 'rc', 'vfl', 'vfb', 'r']);
const LEAGUES = {
  TR1: 'Süper Lig',
  GB1: 'Premier League',
  ES1: 'La Liga',
  IT1: 'Serie A',
  L1: 'Bundesliga',
  FR1: 'Ligue 1',
  PO1: 'Portuguese Liga',
  NL1: 'Eredivisie',
  BE1: 'Belgian Pro League',
  GR1: 'Greek Super League',
  SC1: 'Scottish Premiership',
  C1: 'Swiss Super League',
  A1: 'Austrian Bundesliga',
  RU1: 'Russian Premier League',
  UKR1: 'Ukrainian Premier League',
  BRA1: 'Brasileirão',
  ARG1: 'Argentine Primera División',
  MLS1: 'MLS',
  SA1: 'Saudi Pro League',
};
const CORE_LEAGUES = new Set(['TR1', 'GB1', 'ES1', 'IT1', 'L1', 'FR1']);
const PLAYER_FAME = 30;
const SURNAME_FAME = 50;
const MAX_ENTITIES = 6;

export function fold(text) {
  return text
    .replace(/[İI]/g, (letter) => (letter === 'İ' ? 'i' : 'ı'))
    .toLowerCase()
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`´]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function words(text) {
  return fold(text).split(' ').filter(Boolean);
}

export function openFootball() {
  const db = new DatabaseSync(DATABASE, { readOnly: true });
  const clubName = new Map();
  for (const row of db.prepare("SELECT club_id, language, name FROM club_names WHERE language IN ('tr', 'en')").all()) {
    const entry = clubName.get(row.club_id) ?? {};
    entry[row.language] = row.name;
    clubName.set(row.club_id, entry);
  }
  const clubLeague = new Map(db.prepare('SELECT id, league_code FROM clubs').all().map((row) => [row.id, row.league_code]));
  const displayClub = (id) => {
    const names = clubName.get(id);
    if (!names) return String(id);
    const chosen = CLUBS.display[names.en];
    if (chosen) return chosen;
    const name = names.tr ?? names.en;
    const kept = name.split(' ').filter((token) => !DISPLAY_NOISE.has(token.replace(/\./g, '').toLowerCase()));
    return kept.length > 0 ? kept.join(' ') : name;
  };

  const players = db
    .prepare(
      `SELECT p.id, p.name, p.birth_year, p.position, cn.name AS country,
              COALESCE(MAX(CASE WHEN f.market = 'tr' THEN f.fame END), 0) AS fame_tr,
              COALESCE(MAX(CASE WHEN f.market = 'int' THEN f.fame END), 0) AS fame_int
         FROM players p
         JOIN player_fame f ON f.player_id = p.id
         LEFT JOIN country_names cn ON cn.country_id = p.country_id AND cn.language = 'tr'
        GROUP BY p.id`,
    )
    .all()
    .map((row) => ({ ...row, fame: Math.max(row.fame_tr, row.fame_int) }))
    .filter((row) => row.fame >= PLAYER_FAME && !EXCLUDED.has(row.name));
  const playerById = new Map(players.map((player) => [player.id, player]));

  const phrases = new Map();
  const addPhrase = (phrase, entity) => {
    if (!phrase) return;
    const list = phrases.get(phrase) ?? [];
    list.push(entity);
    phrases.set(phrase, list);
  };
  const surnameOwners = new Map();
  for (const player of players) {
    const tokens = words(player.name);
    addPhrase(tokens.join(' '), { kind: 'player', id: player.id });
    if (tokens.length > 1 && player.fame >= SURNAME_FAME) {
      const surname = tokens.at(-1);
      if (surname.length >= 4) {
        const owners = surnameOwners.get(surname) ?? [];
        owners.push(player);
        surnameOwners.set(surname, owners);
      }
    }
  }
  for (const [surname, owners] of surnameOwners) {
    owners.sort((a, b) => b.fame - a.fame);
    if (owners.length === 1 || owners[0].fame - owners[1].fame >= 20) {
      addPhrase(surname, { kind: 'player', id: owners[0].id });
    }
  }
  const strippedOwners = new Map();
  for (const [id, names] of clubName) {
    for (const name of Object.values(names)) {
      const tokens = words(name);
      addPhrase(tokens.join(' '), { kind: 'club', id });
      const stripped = tokens.filter((token) => !CLUB_NOISE.has(token)).join(' ');
      if (stripped.length >= 5 && stripped !== tokens.join(' ')) {
        const owners = strippedOwners.get(stripped) ?? new Set();
        owners.add(id);
        strippedOwners.set(stripped, owners);
      }
    }
  }
  for (const [stripped, owners] of strippedOwners) {
    if (owners.size === 1) addPhrase(stripped, { kind: 'club', id: [...owners][0] });
  }
  const clubByEnglish = new Map([...clubName].map(([id, names]) => [names.en, id]));
  for (const [alias, english] of Object.entries(CLUBS.aliases)) {
    const id = clubByEnglish.get(english);
    if (id !== undefined) addPhrase(fold(alias), { kind: 'club', id });
  }
  const clubSize = new Map(db.prepare('SELECT club_id, COUNT(*) AS size FROM player_clubs GROUP BY club_id').all().map((row) => [row.club_id, row.size]));
  const clubRank = (id) => (CORE_LEAGUES.has(clubLeague.get(id)) ? 1_000_000 : 0) + (clubSize.get(id) ?? 0);
  for (const [phrase, entities] of phrases) {
    const clubs = entities.filter((entity) => entity.kind === 'club');
    if (clubs.length > 1) {
      const best = clubs.reduce((top, entity) => (clubRank(entity.id) > clubRank(top.id) ? entity : top));
      phrases.set(phrase, [...entities.filter((entity) => entity.kind !== 'club'), best]);
    }
  }
  const longestPhrase = Math.max(...[...phrases.keys()].map((phrase) => phrase.split(' ').length));

  const careerStatement = db.prepare('SELECT club_id, first_year, last_year FROM player_club_years WHERE player_id = ? ORDER BY first_year, last_year');
  const clubsStatement = db.prepare('SELECT club_id FROM player_clubs WHERE player_id = ?');
  const statsStatement = db.prepare("SELECT appearances, goals, assists, is_complete FROM player_stats WHERE player_id = ? ORDER BY source = 'performances' DESC LIMIT 1");
  const profileStatement = db.prepare('SELECT market_value, caps FROM player_profile WHERE player_id = ?');
  const clubPlayersStatement = db.prepare('SELECT player_id FROM player_clubs WHERE club_id = ?');
  const yearsStatement = db.prepare('SELECT first_year, last_year FROM player_club_years WHERE player_id = ? AND club_id = ?');

  function find(text) {
    const tokens = words(text);
    const found = new Map();
    for (let start = 0; start < tokens.length; start += 1) {
      for (let length = Math.min(longestPhrase, tokens.length - start); length >= 1; length -= 1) {
        const entities = phrases.get(tokens.slice(start, start + length).join(' '));
        if (entities) {
          for (const entity of entities) found.set(`${entity.kind}:${entity.id}`, entity);
          start += length - 1;
          break;
        }
      }
    }
    return [...found.values()]
      .map((entity) => ({ ...entity, weight: entity.kind === 'player' ? playerById.get(entity.id).fame : 200 }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, MAX_ENTITIES);
  }

  function career(playerId) {
    return careerStatement.all(playerId).map((row) => ({
      club: displayClub(row.club_id),
      clubId: row.club_id,
      from: row.first_year,
      to: row.last_year,
    }));
  }

  function clubsOf(playerId) {
    return new Set(clubsStatement.all(playerId).map((row) => row.club_id));
  }

  function famousPlayersOf(clubId) {
    return clubPlayersStatement
      .all(clubId)
      .map((row) => playerById.get(row.player_id))
      .filter(Boolean)
      .sort((a, b) => b.fame_tr - a.fame_tr);
  }

  function overlap(firstId, secondId, clubId) {
    const first = yearsStatement.get(firstId, clubId);
    const second = yearsStatement.get(secondId, clubId);
    if (!first || !second) return null;
    const from = Math.max(first.first_year, second.first_year);
    const to = Math.min(first.last_year ?? 9999, second.last_year ?? 9999);
    return from <= to ? { from, to } : null;
  }

  const span = (from, to) => (from === to ? `${from}` : `${from}-${to == null || to >= 2026 ? '' : to}`);

  function playerFacts(playerId) {
    const player = playerById.get(playerId);
    const stats = statsStatement.get(playerId);
    const profile = profileStatement.get(playerId);
    const path = career(playerId).map((step) => `${step.club} (${span(step.from, step.to)})`).join(', ');
    const lines = [`${player.name}: ${player.country ?? '?'}, born ${player.birth_year ?? '?'}, position ${player.position ?? '?'}.`];
    if (path) lines.push(`  Career clubs in order: ${path}.`);
    if (stats) {
      lines.push(`  Club career: ${stats.appearances} matches, ${stats.goals} goals, ${stats.assists ?? '?'} assists${stats.is_complete ? '' : ' (incomplete record)'}.`);
    }
    if (profile?.caps) lines.push(`  National team caps: ${profile.caps}.`);
    return lines;
  }

  function pairFacts(first, second) {
    if (first.kind === 'player' && second.kind === 'player') {
      const shared = [...clubsOf(first.id)].filter((club) => clubsOf(second.id).has(club));
      const names = `${playerById.get(first.id).name} and ${playerById.get(second.id).name}`;
      if (shared.length === 0) return [`${names} never played for the same club.`];
      return shared.map((club) => {
        const together = overlap(first.id, second.id, club);
        return together
          ? `${names} were teammates at ${displayClub(club)} (${span(together.from, together.to)}).`
          : `${names} both played for ${displayClub(club)}, but not at the same time.`;
      });
    }
    if (first.kind === 'club' && second.kind === 'club') {
      const bridge = famousPlayersOf(first.id).filter((player) => clubsOf(player.id).has(second.id));
      if (bridge.length === 0) return [];
      return [`Well-known players who played for both ${displayClub(first.id)} and ${displayClub(second.id)}: ${bridge.slice(0, 6).map((player) => player.name).join(', ')} (${bridge.length} in our database).`];
    }
    const player = first.kind === 'player' ? first : second;
    const club = first.kind === 'club' ? first : second;
    const years = yearsStatement.get(player.id, club.id);
    const name = playerById.get(player.id).name;
    if (years) return [`${name} played for ${displayClub(club.id)} (${span(years.first_year, years.last_year)}).`];
    if (clubsOf(player.id).has(club.id)) return [`${name} played for ${displayClub(club.id)}.`];
    return [`${name} never played for ${displayClub(club.id)}.`];
  }

  function facts(text) {
    const entities = find(text);
    const lines = [];
    for (const entity of entities) {
      if (entity.kind === 'player') lines.push(...playerFacts(entity.id));
      else lines.push(`${displayClub(entity.id)}: club in the ${LEAGUES[clubLeague.get(entity.id)] ?? clubLeague.get(entity.id)}.`);
    }
    for (let first = 0; first < entities.length; first += 1) {
      for (let second = first + 1; second < entities.length; second += 1) {
        lines.push(...pairFacts(entities[first], entities[second]));
      }
    }
    return lines;
  }

  return { db, players, playerById, displayClub, clubLeague, isCoreClub: (id) => CORE_LEAGUES.has(clubLeague.get(id)), career, clubsOf, famousPlayersOf, statsStatement, find, facts };
}
