import type { Statement } from './statements';

export interface RankedRow {
  id: number;
  value: number;
}

export function topValuesStatement(countryId: number, limit: number): Statement {
  return {
    sql: `SELECT p.id, r.market_value AS value FROM players p
          JOIN player_profile r ON r.player_id = p.id
          WHERE p.country_id = ? AND r.market_value IS NOT NULL
          ORDER BY r.market_value DESC, p.id LIMIT ?`,
    parameters: [countryId, limit],
  };
}

export function topCountryGoalsStatement(countryId: number, limit: number): Statement {
  return {
    sql: `SELECT p.id, s.goals AS value FROM players p
          JOIN player_stats s ON s.player_id = p.id
          WHERE p.country_id = ?
          ORDER BY s.goals DESC, p.id LIMIT ?`,
    parameters: [countryId, limit],
  };
}

export function topClubGoalsStatement(clubId: number, limit: number): Statement {
  return {
    sql: `SELECT p.id, s.goals AS value FROM player_clubs pc
          JOIN players p ON p.id = pc.player_id
          JOIN player_stats s ON s.player_id = p.id
          WHERE pc.club_id = ?
          ORDER BY s.goals DESC, p.id LIMIT ?`,
    parameters: [clubId, limit],
  };
}
