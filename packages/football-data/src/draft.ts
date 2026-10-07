import type { Statement } from './statements';

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

export function draftEligible(playerColumn: string, clubParameter: string): string {
  return `EXISTS (SELECT 1 FROM player_clubs pc WHERE pc.player_id = ${playerColumn} AND pc.club_id = ${clubParameter})
          AND EXISTS (SELECT 1 FROM player_stats s WHERE s.player_id = ${playerColumn} AND s.assists IS NOT NULL)`;
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
          GROUP BY pc.club_id
          HAVING ${counts.join(' AND ')}
          ORDER BY SUM(f.fame >= ?) DESC, pc.club_id`,
    parameters: [market, ...POSITION_CODES.map(() => minimumFame), minimumFame],
  };
}

export function draftEntryStatement(footballerId: number, clubId: number): Statement {
  return {
    sql: `SELECT p.id, p.position, s.assists AS value FROM players p
          JOIN player_stats s ON s.player_id = p.id
          WHERE p.id = ? AND p.position IS NOT NULL AND ${draftEligible('p.id', '?')}`,
    parameters: [footballerId, clubId],
  };
}

export function draftCandidatesStatement(
  market: string,
  clubId: number,
  positions: readonly string[],
  excludedIds: readonly number[],
  limit: number,
): Statement {
  const wanted = positions.length > 0 ? positions : [''];
  const excluded = excludedIds.length > 0 ? excludedIds : [0];
  return {
    sql: `SELECT p.id, p.position, s.assists AS value, COALESCE(f.fame, 0) AS fame FROM players p
          JOIN player_stats s ON s.player_id = p.id
          LEFT JOIN player_fame f ON f.player_id = p.id AND f.market = ?
          WHERE p.position IN (${placeholders(wanted.length)})
            AND p.id NOT IN (${placeholders(excluded.length)})
            AND ${draftEligible('p.id', '?')}
          ORDER BY COALESCE(f.fame, 0) DESC, p.id LIMIT ?`,
    parameters: [market, ...wanted, ...excluded, clubId, limit],
  };
}
