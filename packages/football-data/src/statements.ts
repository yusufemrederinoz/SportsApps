import type { Grid, Header, HeaderKind } from '@sportapps/game-core';

export type StatementParameter = string | number;

export interface Statement {
  sql: string;
  parameters: StatementParameter[];
}

export interface GridHeaderRow {
  axis: 'row' | 'column';
  position: number;
  kind: HeaderKind;
  referenceId: number;
}

function headerCondition(header: Header, playerColumn: string): { sql: string; parameter: StatementParameter } {
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

export function marketsStatement(): Statement {
  return { sql: 'SELECT code, language FROM markets ORDER BY code', parameters: [] };
}

export function gridCountStatement(market: string, difficulty: number): Statement {
  return {
    sql: 'SELECT COUNT(*) AS total FROM grids WHERE market = ? AND difficulty = ?',
    parameters: [market, difficulty],
  };
}

export function gridAtOffsetStatement(market: string, difficulty: number, offset: number): Statement {
  return {
    sql: 'SELECT id FROM grids WHERE market = ? AND difficulty = ? ORDER BY id LIMIT 1 OFFSET ?',
    parameters: [market, difficulty, offset],
  };
}

export function gridOffset(total: number, random: () => number): number {
  return Math.min(total - 1, Math.floor(random() * total));
}

export function gridHeadersStatement(gridId: number): Statement {
  return {
    sql: `SELECT axis, position, kind, reference_id AS referenceId
          FROM grid_headers WHERE grid_id = ? ORDER BY axis, position`,
    parameters: [gridId],
  };
}

export function toGrid(gridId: number, headers: readonly GridHeaderRow[]): Grid | null {
  const pick = (axis: GridHeaderRow['axis']) =>
    headers
      .filter((header) => header.axis === axis)
      .sort((first, second) => first.position - second.position)
      .map(({ kind, referenceId }): Header => ({ kind, referenceId }));
  const rows = pick('row');
  const columns = pick('column');
  const [firstRow, secondRow, thirdRow] = rows;
  const [firstColumn, secondColumn, thirdColumn] = columns;
  if (rows.length !== 3 || columns.length !== 3) {
    return null;
  }
  if (!firstRow || !secondRow || !thirdRow || !firstColumn || !secondColumn || !thirdColumn) {
    return null;
  }
  return { id: gridId, rows: [firstRow, secondRow, thirdRow], columns: [firstColumn, secondColumn, thirdColumn] };
}

export function correctAnswerStatement(footballerId: number, row: Header, column: Header): Statement {
  const rowCondition = headerCondition(row, '?');
  const columnCondition = headerCondition(column, '?');
  return {
    sql: `SELECT (${rowCondition.sql} AND ${columnCondition.sql}) AS correct`,
    parameters: [rowCondition.parameter, footballerId, columnCondition.parameter, footballerId],
  };
}

export function minimumFameStatement(difficulty: number): Statement {
  return {
    sql: 'SELECT minimum_fame AS minimumFame FROM grid_levels WHERE difficulty = ?',
    parameters: [difficulty],
  };
}

export function knownAnswersStatement(
  market: string,
  row: Header,
  column: Header,
  minimumFame: number,
  limit: number,
): Statement {
  const rowCondition = headerCondition(row, 'f.player_id');
  const columnCondition = headerCondition(column, 'f.player_id');
  return {
    sql: `SELECT f.player_id AS id FROM player_fame f
          WHERE f.market = ? AND f.fame >= ? AND ${rowCondition.sql} AND ${columnCondition.sql}
          ORDER BY f.fame DESC, f.player_id
          LIMIT ?`,
    parameters: [market, minimumFame, rowCondition.parameter, columnCondition.parameter, limit],
  };
}

export function rareAnswersStatement(
  market: string,
  row: Header,
  column: Header,
  minimumFame: number,
  limit: number,
): Statement {
  const rowCondition = headerCondition(row, 'f.player_id');
  const columnCondition = headerCondition(column, 'f.player_id');
  return {
    sql: `SELECT f.player_id AS id, f.fame FROM player_fame f
          WHERE f.market = ? AND f.fame >= ? AND ${rowCondition.sql} AND ${columnCondition.sql}
          ORDER BY f.fame ASC, f.player_id
          LIMIT ?`,
    parameters: [market, minimumFame, rowCondition.parameter, columnCondition.parameter, limit],
  };
}

export function fameStatement(market: string, footballerId: number): Statement {
  return {
    sql: 'SELECT COALESCE((SELECT fame FROM player_fame WHERE market = ? AND player_id = ?), 0) AS fame',
    parameters: [market, footballerId],
  };
}

export function nearMissesStatement(
  market: string,
  matching: Header,
  missing: Header,
  minimumFame: number,
  limit: number,
): Statement {
  const matchingCondition = headerCondition(matching, 'f.player_id');
  const missingCondition = headerCondition(missing, 'f.player_id');
  return {
    sql: `SELECT f.player_id AS id FROM player_fame f
          WHERE f.market = ? AND f.fame >= ? AND ${matchingCondition.sql} AND NOT ${missingCondition.sql}
          ORDER BY f.fame DESC, f.player_id
          LIMIT ?`,
    parameters: [market, minimumFame, matchingCondition.parameter, missingCondition.parameter, limit],
  };
}
