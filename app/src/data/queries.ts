import { nameTokens, type BotOption, type CellPosition, type Grid, type Header } from '@sportapps/game-core';

import type {
  Difficulty,
  FootballerSummary,
  GridView,
  HeaderView,
  Market,
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

interface HeaderRow extends HeaderView {
  axis: 'row' | 'column';
  position: number;
}

function isTriple<T>(items: T[]): items is [T, T, T] {
  return items.length === 3;
}

function headerCondition(header: Header, playerColumn: string): { sql: string; parameter: QueryParameter } {
  if (header.kind === 'club') {
    return {
      sql: `EXISTS (SELECT 1 FROM player_clubs WHERE club_id = ? AND player_id = ${playerColumn})`,
      parameter: header.referenceId,
    };
  }
  return {
    sql: `EXISTS (SELECT 1 FROM players WHERE country_id = ? AND id = ${playerColumn})`,
    parameter: header.referenceId,
  };
}

export async function resolveMarket(database: QueryRunner, language: string): Promise<Market | null> {
  const markets = await database.getAllAsync<Market>('SELECT code, language FROM markets ORDER BY code', []);
  return markets.find((market) => market.language === language) ?? markets[0] ?? null;
}

export async function pickGridId(
  database: QueryRunner,
  market: string,
  difficulty: Difficulty,
  random: () => number = Math.random,
): Promise<number | null> {
  const count = await database.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM grids WHERE market = ? AND difficulty = ?',
    [market, difficulty],
  );
  if (!count || count.total === 0) {
    return null;
  }
  const offset = Math.min(count.total - 1, Math.floor(random() * count.total));
  const row = await database.getFirstAsync<{ id: number }>(
    'SELECT id FROM grids WHERE market = ? AND difficulty = ? ORDER BY id LIMIT 1 OFFSET ?',
    [market, difficulty, offset],
  );
  return row?.id ?? null;
}

export async function loadGrid(database: QueryRunner, gridId: number, language: string): Promise<GridView | null> {
  const headers = await database.getAllAsync<HeaderRow>(
    `SELECT h.axis, h.position, h.kind, h.reference_id AS referenceId, ${HEADER_NAME} AS name,
            CASE h.kind WHEN 'country' THEN (SELECT code FROM countries WHERE id = h.reference_id) END AS countryCode
     FROM grid_headers h WHERE h.grid_id = ? ORDER BY h.axis, h.position`,
    [language, language, gridId],
  );
  const toView = ({ kind, referenceId, name, countryCode }: HeaderRow): HeaderView => ({
    kind,
    referenceId,
    name,
    countryCode,
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

export async function searchFootballers(
  database: QueryRunner,
  market: string,
  text: string,
  limit = 20,
): Promise<FootballerSummary[]> {
  const tokens = nameTokens(text);
  if (tokens.join('').length < MINIMUM_SEARCH_LENGTH) {
    return [];
  }
  const match = tokens.map((token) => `"${token}"*`).join(' ');
  return database.getAllAsync<FootballerSummary>(
    `SELECT p.id, p.name, p.birth_year AS birthYear, c.code AS countryCode
     FROM (SELECT DISTINCT player_id FROM player_search WHERE player_search MATCH ?) s
     JOIN players p ON p.id = s.player_id
     LEFT JOIN countries c ON c.id = p.country_id
     LEFT JOIN player_fame f ON f.player_id = p.id AND f.market = ?
     ORDER BY COALESCE(f.fame, 0) DESC, p.name
     LIMIT ?`,
    [match, market, limit],
  );
}

export async function isCorrectAnswer(
  database: QueryRunner,
  footballerId: number,
  row: Header,
  column: Header,
): Promise<boolean> {
  const rowCondition = headerCondition(row, '?');
  const columnCondition = headerCondition(column, '?');
  const result = await database.getFirstAsync<{ correct: number }>(
    `SELECT (${rowCondition.sql} AND ${columnCondition.sql}) AS correct`,
    [rowCondition.parameter, footballerId, columnCondition.parameter, footballerId],
  );
  return result?.correct === 1;
}

export async function loadFootballerName(database: QueryRunner, footballerId: number): Promise<string | null> {
  const row = await database.getFirstAsync<{ name: string }>('SELECT name FROM players WHERE id = ?', [footballerId]);
  return row?.name ?? null;
}

export async function loadMinimumFame(database: QueryRunner, difficulty: Difficulty): Promise<number> {
  const level = await database.getFirstAsync<{ minimumFame: number }>(
    'SELECT minimum_fame AS minimumFame FROM grid_levels WHERE difficulty = ?',
    [difficulty],
  );
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
      const rowCondition = headerCondition(grid.rows[position.row] as Header, 'f.player_id');
      const columnCondition = headerCondition(grid.columns[position.column] as Header, 'f.player_id');
      const rows = await database.getAllAsync<{ id: number }>(
        `SELECT f.player_id AS id FROM player_fame f
         WHERE f.market = ? AND f.fame >= ? AND ${rowCondition.sql} AND ${columnCondition.sql}
         ORDER BY f.fame DESC, f.player_id
         LIMIT ?`,
        [market, minimumFame, rowCondition.parameter, columnCondition.parameter, limit],
      );
      return { position, footballerIds: rows.map((row) => row.id) };
    }),
  );
}
