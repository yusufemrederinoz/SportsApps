import type { Statement } from './statements';

export interface FootballerFactsRow {
  countryId: number | null;
  position: string | null;
  birthYear: number | null;
}

export interface CareerStepRow {
  clubId: number;
  firstYear: number;
  lastYear: number | null;
}

export function careerCandidatesStatement(market: string, minimumFame: number, minimumClubs: number, limit: number): Statement {
  return {
    sql: `SELECT f.player_id AS id FROM player_fame f
          WHERE f.market = ? AND f.fame >= ?
            AND (SELECT COUNT(*) FROM player_club_years y WHERE y.player_id = f.player_id) >= ?
            AND NOT EXISTS (
              SELECT 1 FROM player_clubs c WHERE c.player_id = f.player_id
                AND NOT EXISTS (SELECT 1 FROM player_club_years y WHERE y.player_id = c.player_id AND y.club_id = c.club_id)
            )
          ORDER BY f.fame DESC, f.player_id LIMIT ?`,
    parameters: [market, minimumFame, minimumClubs, limit],
  };
}

export function footballerFactsStatement(footballerId: number): Statement {
  return {
    sql: 'SELECT country_id AS countryId, position, birth_year AS birthYear FROM players WHERE id = ?',
    parameters: [footballerId],
  };
}

export function careerPathStatement(footballerId: number): Statement {
  return {
    sql: `SELECT club_id AS clubId, first_year AS firstYear, last_year AS lastYear FROM player_club_years
          WHERE player_id = ? ORDER BY first_year, COALESCE(last_year, first_year), club_id`,
    parameters: [footballerId],
  };
}
