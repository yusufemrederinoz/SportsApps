import type { DraftMetric } from '@sportapps/protocol';

import { inCoreLeague, type Statement } from './statements';

export interface DraftEntryRow {
  id: number;
  position: string;
  value: number;
}

export interface DraftCandidateRow extends DraftEntryRow {
  fame: number;
}

const POSITION_CODES = ['GK', 'DF', 'MF', 'FW'] as const;

function placeholders(count: number): string {
  return Array.from({ length: count }, () => '?').join(', ');
}

const METRIC_SOURCES: Record<DraftMetric, { table: string; column: string }> = {
  goals: { table: 'player_stats', column: 'goals' },
  assists: { table: 'player_stats', column: 'assists' },
  appearances: { table: 'player_stats', column: 'NULLIF(appearances, 0)' },
  marketValue: { table: 'player_profile', column: 'market_value' },
};

export function draftValue(playerColumn: string, metric: DraftMetric): string {
  const source = METRIC_SOURCES[metric];
  return `(SELECT ${source.column} FROM ${source.table} WHERE player_id = ${playerColumn})`;
}

export function draftEligible(playerColumn: string, clubParameter: string, metric: DraftMetric = 'assists'): string {
  return `EXISTS (SELECT 1 FROM player_clubs pc WHERE pc.player_id = ${playerColumn} AND pc.club_id = ${clubParameter})
          AND ${draftValue(playerColumn, metric)} IS NOT NULL`;
}

export function draftClubsStatement(market: string, minimumFame: number, minimumPerPosition: number): Statement {
  const counts = POSITION_CODES.map(
    (position) => `SUM(p.position = '${position}' AND f.fame >= ?) >= ${position === 'GK' ? 2 : minimumPerPosition}`,
  );
  return {
    sql: `SELECT pc.club_id AS id FROM player_clubs pc
          JOIN players p ON p.id = pc.player_id
          JOIN player_stats s ON s.player_id = p.id AND s.assists IS NOT NULL
          JOIN player_fame f ON f.player_id = p.id AND f.market = ?
          WHERE ${inCoreLeague('pc.club_id')}
          GROUP BY pc.club_id
          HAVING ${counts.join(' AND ')}
          ORDER BY SUM(f.fame >= ?) DESC, pc.club_id`,
    parameters: [market, ...POSITION_CODES.map(() => minimumFame), minimumFame],
  };
}

export function draftEntryStatement(footballerId: number, clubId: number, metric: DraftMetric = 'assists'): Statement {
  return {
    sql: `SELECT p.id, p.position, ${draftValue('p.id', metric)} AS value FROM players p
          WHERE p.id = ? AND p.position IS NOT NULL AND ${draftEligible('p.id', '?', metric)}`,
    parameters: [footballerId, clubId],
  };
}

export function draftCandidatesStatement(
  market: string,
  clubId: number,
  positions: readonly string[],
  excludedIds: readonly number[],
  limit: number,
  metric: DraftMetric = 'assists',
): Statement {
  const wanted = positions.length > 0 ? positions : [''];
  const excluded = excludedIds.length > 0 ? excludedIds : [0];
  return {
    sql: `SELECT p.id, p.position, ${draftValue('p.id', metric)} AS value, COALESCE(f.fame, 0) AS fame FROM players p
          LEFT JOIN player_fame f ON f.player_id = p.id AND f.market = ?
          WHERE p.position IN (${placeholders(wanted.length)})
            AND p.id NOT IN (${placeholders(excluded.length)})
            AND ${draftEligible('p.id', '?', metric)}
          ORDER BY COALESCE(f.fame, 0) DESC, p.id LIMIT ?`,
    parameters: [market, ...wanted, ...excluded, clubId, limit],
  };
}

export function draftMetricCountStatement(clubId: number, metric: DraftMetric): Statement {
  return {
    sql: `SELECT COUNT(*) AS count FROM player_clubs pc
          JOIN players p ON p.id = pc.player_id
          WHERE pc.club_id = ? AND p.position IS NOT NULL AND ${draftValue('pc.player_id', metric)} IS NOT NULL`,
    parameters: [clubId],
  };
}

export function draftValuesStatement(footballerIds: readonly number[], metric: DraftMetric): Statement {
  return {
    sql: `SELECT p.id, ${draftValue('p.id', metric)} AS value FROM players p
          WHERE p.id IN (${placeholders(footballerIds.length)}) AND ${draftValue('p.id', metric)} IS NOT NULL`,
    parameters: [...footballerIds],
  };
}
