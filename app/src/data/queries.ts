import {
  conceptCondition,
  correctAnswerStatement,
  draftEligible,
  gridAtOffsetStatement,
  gridCountStatement,
  gridOffset,
  knownAnswersStatement,
  marketsStatement,
  minimumFameStatement,
} from '@sportapps/football-data';
import { nameTokens, type BotOption, type CellPosition, type Grid, type Header } from '@sportapps/game-core';
import type { DuelConcept } from '@sportapps/protocol';

import type {
  ClubLabel,
  ConceptLabel,
  Difficulty,
  FootballerSummary,
  GridView,
  HeaderView,
  Market,
  PortraitCredit,
  QueryParameter,
  QueryRunner,
} from './types';

const FALLBACK_LANGUAGE = 'en';
const MINIMUM_SEARCH_LENGTH = 2;

const HEADER_NAME = `
  COALESCE(
    CASE h.kind
      WHEN 'club' THEN (SELECT name FROM club_names WHERE club_id = h.reference_id AND language = ?)
      ELSE (SELECT name FROM country_names WHERE country_id = h.reference_id AND language = ?)
    END,
    CASE h.kind
      WHEN 'club' THEN (SELECT name FROM club_names WHERE club_id = h.reference_id AND language = '${FALLBACK_LANGUAGE}')
      ELSE (SELECT name FROM country_names WHERE country_id = h.reference_id AND language = '${FALLBACK_LANGUAGE}')
    END
  )`;

const FOOTBALLER_COLUMNS = `p.id, p.name, p.birth_year AS birthYear, c.code AS countryCode, p.position AS role,
            EXISTS (SELECT 1 FROM player_portraits WHERE player_id = p.id) AS hasPortrait`;

type FootballerRow = Omit<FootballerSummary, 'hasPortrait'> & { hasPortrait: number };

function toFootballer(row: FootballerRow): FootballerSummary {
  return { ...row, hasPortrait: row.hasPortrait === 1 };
}

interface HeaderRow extends Omit<HeaderView, 'local'> {
  axis: 'row' | 'column';
  position: number;
  local: number;
}

function isTriple<T>(items: T[]): items is [T, T, T] {
  return items.length === 3;
}

export async function resolveMarket(database: QueryRunner, language: string): Promise<Market | null> {
  const { sql, parameters } = marketsStatement();
  const markets = await database.getAllAsync<Market>(sql, parameters);
  return markets.find((market) => market.language === language) ?? markets[0] ?? null;
}

export async function pickGridId(
  database: QueryRunner,
  market: string,
  difficulty: Difficulty,
  random: () => number = Math.random,
): Promise<number | null> {
  const counting = gridCountStatement(market, difficulty);
  const count = await database.getFirstAsync<{ total: number }>(counting.sql, counting.parameters);
  if (!count || count.total === 0) {
    return null;
  }
  const picking = gridAtOffsetStatement(market, difficulty, gridOffset(count.total, random));
  const row = await database.getFirstAsync<{ id: number }>(picking.sql, picking.parameters);
  return row?.id ?? null;
}

export async function loadGrid(database: QueryRunner, gridId: number, language: string): Promise<GridView | null> {
  const headers = await database.getAllAsync<HeaderRow>(
    `SELECT h.axis, h.position, h.kind, h.reference_id AS referenceId, ${HEADER_NAME} AS name,
            CASE h.kind WHEN 'country' THEN (SELECT code FROM countries WHERE id = h.reference_id) END AS countryCode,
            CASE h.kind
              WHEN 'country' THEN 1
              ELSE EXISTS (
                SELECT 1 FROM clubs c JOIN markets m ON m.home_league_code = c.league_code
                WHERE c.id = h.reference_id AND m.language = ?
              )
            END AS local
     FROM grid_headers h WHERE h.grid_id = ? ORDER BY h.axis, h.position`,
    [language, language, language, gridId],
  );
  const toView = ({ kind, referenceId, name, countryCode, local }: HeaderRow): HeaderView => ({
    kind,
    referenceId,
    name,
    countryCode,
    local: local === 1,
  });
  const rows = headers.filter((header) => header.axis === 'row').map(toView);
  const columns = headers.filter((header) => header.axis === 'column').map(toView);
  if (!isTriple(rows) || !isTriple(columns)) {
    return null;
  }
  const toHeader = ({ kind, referenceId }: HeaderView): Header => ({ kind, referenceId });
  const grid: Grid = {
    id: gridId,
    rows: [toHeader(rows[0]), toHeader(rows[1]), toHeader(rows[2])],
    columns: [toHeader(columns[0]), toHeader(columns[1]), toHeader(columns[2])],
  };
  return { grid, rows, columns };
}

async function searchWhere(
  database: QueryRunner,
  market: string,
  text: string,
  condition: { sql: string; parameters: QueryParameter[] },
  limit: number,
): Promise<FootballerSummary[]> {
  const tokens = nameTokens(text);
  if (tokens.join('').length < MINIMUM_SEARCH_LENGTH) {
    return [];
  }
  const match = tokens.map((token) => `"${token}"*`).join(' ');
  const rows = await database.getAllAsync<FootballerRow>(
    `SELECT ${FOOTBALLER_COLUMNS}
     FROM (SELECT DISTINCT player_id FROM player_search WHERE player_search MATCH ?) s
     JOIN players p ON p.id = s.player_id
     LEFT JOIN countries c ON c.id = p.country_id
     LEFT JOIN player_fame f ON f.player_id = p.id AND f.market = ?
     WHERE ${condition.sql}
     ORDER BY COALESCE(f.fame, 0) DESC, p.name
     LIMIT ?`,
    [match, market, ...condition.parameters, limit],
  );
  return rows.map(toFootballer);
}

export function searchFootballers(
  database: QueryRunner,
  market: string,
  text: string,
  limit = 20,
): Promise<FootballerSummary[]> {
  return searchWhere(database, market, text, { sql: '1', parameters: [] }, limit);
}

export function searchConceptFootballers(
  database: QueryRunner,
  market: string,
  concept: DuelConcept,
  text: string,
  limit = 20,
): Promise<FootballerSummary[]> {
  return searchWhere(database, market, text, conceptCondition(concept, market, 'p.id'), limit);
}

export function searchDraftFootballers(
  database: QueryRunner,
  market: string,
  clubId: number,
  positions: readonly string[],
  excludedIds: readonly number[],
  text: string,
  limit = 20,
): Promise<FootballerSummary[]> {
  const wanted = positions.length > 0 ? positions : [''];
  const excluded = excludedIds.length > 0 ? excludedIds : [0];
  return searchWhere(
    database,
    market,
    text,
    {
      sql: `p.position IN (${wanted.map(() => '?').join(', ')})
            AND p.id NOT IN (${excluded.map(() => '?').join(', ')})
            AND ${draftEligible('p.id', '?')}`,
      parameters: [...wanted, ...excluded, clubId],
    },
    limit,
  );
}

export async function loadHeaderLabel(
  database: QueryRunner,
  header: Header,
  market: string,
  language: string,
): Promise<HeaderView> {
  if (header.kind === 'club') {
    const club = await loadClubLabel(database, header.referenceId, market, language);
    return { kind: 'club', referenceId: header.referenceId, name: club.name, countryCode: null, local: club.local };
  }
  const row = await database.getFirstAsync<{ name: string | null; code: string | null }>(
    `SELECT COALESCE(
              (SELECT name FROM country_names WHERE country_id = c.id AND language = ?),
              (SELECT name FROM country_names WHERE country_id = c.id AND language = '${FALLBACK_LANGUAGE}')
            ) AS name, c.code
     FROM countries c WHERE c.id = ?`,
    [language, header.referenceId],
  );
  return { kind: 'country', referenceId: header.referenceId, name: row?.name ?? '', countryCode: row?.code ?? null, local: true };
}

export async function loadClubLabel(database: QueryRunner, clubId: number, market: string, language: string): Promise<ClubLabel> {
  const row = await database.getFirstAsync<{ name: string | null; local: number }>(
    `SELECT COALESCE(
              (SELECT name FROM club_names WHERE club_id = c.id AND language = ?),
              (SELECT name FROM club_names WHERE club_id = c.id AND language = '${FALLBACK_LANGUAGE}')
            ) AS name,
            EXISTS (SELECT 1 FROM markets m WHERE m.code = ? AND m.home_league_code = c.league_code) AS local
     FROM clubs c WHERE c.id = ?`,
    [language, market, clubId],
  );
  return { id: clubId, name: row?.name ?? '', local: row?.local === 1 };
}

export async function loadConceptLabel(
  database: QueryRunner,
  concept: DuelConcept,
  market: string,
  language: string,
): Promise<ConceptLabel> {
  switch (concept.kind) {
    case 'club': {
      const row = await database.getFirstAsync<{ name: string | null; local: number }>(
        `SELECT COALESCE(
                  (SELECT name FROM club_names WHERE club_id = c.id AND language = ?),
                  (SELECT name FROM club_names WHERE club_id = c.id AND language = '${FALLBACK_LANGUAGE}')
                ) AS name,
                EXISTS (SELECT 1 FROM markets m WHERE m.code = ? AND m.home_league_code = c.league_code) AS local
         FROM clubs c WHERE c.id = ?`,
        [language, market, concept.clubId],
      );
      return { name: row?.name ?? null, leagueCode: null, local: row?.local === 1 };
    }
    case 'country': {
      const row = await database.getFirstAsync<{ name: string | null }>(
        `SELECT COALESCE(
                  (SELECT name FROM country_names WHERE country_id = ? AND language = ?),
                  (SELECT name FROM country_names WHERE country_id = ? AND language = '${FALLBACK_LANGUAGE}')
                ) AS name`,
        [concept.countryId, language, concept.countryId],
      );
      return { name: row?.name ?? null, leagueCode: null, local: true };
    }
    case 'league': {
      const row = await database.getFirstAsync<{ local: number }>(
        'SELECT EXISTS (SELECT 1 FROM markets WHERE code = ? AND home_league_code = ?) AS local',
        [market, concept.leagueCode],
      );
      return { name: null, leagueCode: concept.leagueCode, local: row?.local === 1 };
    }
    case 'home-league-foreigners': {
      const row = await database.getFirstAsync<{ code: string | null }>(
        'SELECT home_league_code AS code FROM markets WHERE code = ?',
        [market],
      );
      return { name: null, leagueCode: row?.code ?? null, local: true };
    }
    case 'home-nationals-abroad':
      return { name: null, leagueCode: null, local: true };
  }
}

export async function isCorrectAnswer(
  database: QueryRunner,
  footballerId: number,
  row: Header,
  column: Header,
): Promise<boolean> {
  const { sql, parameters } = correctAnswerStatement(footballerId, row, column);
  const result = await database.getFirstAsync<{ correct: number }>(sql, parameters);
  return result?.correct === 1;
}

export async function loadFootballer(database: QueryRunner, footballerId: number): Promise<FootballerSummary | null> {
  const row = await database.getFirstAsync<FootballerRow>(
    `SELECT ${FOOTBALLER_COLUMNS}
     FROM players p LEFT JOIN countries c ON c.id = p.country_id WHERE p.id = ?`,
    [footballerId],
  );
  return row ? toFootballer(row) : null;
}

export async function loadPortraitCredits(database: QueryRunner): Promise<PortraitCredit[]> {
  return database.getAllAsync<PortraitCredit>(
    `SELECT pp.player_id AS playerId, p.name, pp.author, pp.license, pp.source_url AS sourceUrl
     FROM player_portraits pp JOIN players p ON p.id = pp.player_id
     ORDER BY p.name, pp.player_id`,
    [],
  );
}

export async function loadMinimumFame(database: QueryRunner, difficulty: Difficulty): Promise<number> {
  const { sql, parameters } = minimumFameStatement(difficulty);
  const level = await database.getFirstAsync<{ minimumFame: number }>(sql, parameters);
  return level?.minimumFame ?? 0;
}

export async function loadBotOptions(
  database: QueryRunner,
  market: string,
  grid: Grid,
  positions: readonly CellPosition[],
  minimumFame: number,
  limit = 8,
): Promise<BotOption[]> {
  return Promise.all(
    positions.map(async (position) => {
      const { sql, parameters } = knownAnswersStatement(
        market,
        grid.rows[position.row] as Header,
        grid.columns[position.column] as Header,
        minimumFame,
        limit,
      );
      const rows = await database.getAllAsync<{ id: number }>(sql, parameters);
      return { position, footballerIds: rows.map((row) => row.id) };
    }),
  );
}
