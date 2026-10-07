import type { Statement } from './statements';

export function chainSeedsStatement(market: string, minimumFame: number, minimumClubs: number, limit: number): Statement {
  return {
    sql: `SELECT f.player_id AS id FROM player_fame f
          WHERE f.market = ? AND f.fame >= ?
            AND (SELECT COUNT(*) FROM player_clubs pc WHERE pc.player_id = f.player_id) >= ?
          ORDER BY f.fame DESC, f.player_id LIMIT ?`,
    parameters: [market, minimumFame, minimumClubs, limit],
  };
}

export function sharedClubStatement(market: string, firstId: number, secondId: number): Statement {
  return {
    sql: `SELECT a.club_id AS id FROM player_clubs a
          JOIN player_clubs b ON b.club_id = a.club_id AND b.player_id = ?
          JOIN clubs c ON c.id = a.club_id
          WHERE a.player_id = ?
          ORDER BY c.league_code = (SELECT home_league_code FROM markets WHERE code = ?) DESC, a.club_id
          LIMIT 1`,
    parameters: [secondId, firstId, market],
  };
}

export function chainCandidatesStatement(
  market: string,
  footballerId: number,
  excludedIds: readonly number[],
  minimumFame: number,
  limit: number,
): Statement {
  const excluded = excludedIds.length > 0 ? excludedIds : [0];
  return {
    sql: `SELECT DISTINCT f.player_id AS id, f.fame FROM player_clubs a
          JOIN player_clubs b ON b.club_id = a.club_id
          JOIN player_fame f ON f.player_id = b.player_id AND f.market = ? AND f.fame >= ?
          WHERE a.player_id = ? AND b.player_id NOT IN (${excluded.map(() => '?').join(', ')})
          ORDER BY f.fame DESC, f.player_id LIMIT ?`,
    parameters: [market, minimumFame, footballerId, ...excluded, limit],
  };
}
