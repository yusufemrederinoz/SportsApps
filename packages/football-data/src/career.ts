import { inCoreLeague, type Statement, type StatementParameter } from './statements';

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
              SELECT 1 FROM player_clubs c WHERE c.player_id = f.player_id AND ${inCoreLeague('c.club_id')}
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

export interface ClubStatsRow {
  clubId: number;
  appearances: number | null;
  goals: number | null;
}

export interface CareerDecoyFilter {
  countryId?: number | null;
  position?: string | null;
  clubId?: number | null;
}

export function careerClubStatsStatement(footballerId: number): Statement {
  return {
    sql: 'SELECT club_id AS clubId, appearances, goals FROM player_club_stats WHERE player_id = ?',
    parameters: [footballerId],
  };
}

export function careerDecoysStatement(
  market: string,
  minimumFame: number,
  filter: CareerDecoyFilter,
  excludedIds: readonly number[],
  limit: number,
): Statement {
  const excluded = excludedIds.length > 0 ? excludedIds : [0];
  const conditions: string[] = [`p.id NOT IN (${excluded.map(() => '?').join(', ')})`];
  const parameters: StatementParameter[] = [market, minimumFame, ...excluded];
  if (filter.countryId != null) {
    conditions.push('p.country_id = ?');
    parameters.push(filter.countryId);
  }
  if (filter.position != null) {
    conditions.push('p.position = ?');
    parameters.push(filter.position);
  }
  if (filter.clubId != null) {
    conditions.push('EXISTS (SELECT 1 FROM player_clubs c WHERE c.player_id = p.id AND c.club_id = ?)');
    parameters.push(filter.clubId);
  }
  return {
    sql: `SELECT p.id FROM players p
          JOIN player_fame f ON f.player_id = p.id AND f.market = ? AND f.fame >= ?
          WHERE ${conditions.join(' AND ')}
          ORDER BY f.fame DESC, p.id LIMIT ?`,
    parameters: [...parameters, limit],
  };
}

export function careerPathStatement(footballerId: number): Statement {
  return {
    sql: `SELECT club_id AS clubId, first_year AS firstYear, last_year AS lastYear FROM player_club_years
          WHERE player_id = ? ORDER BY first_year, COALESCE(last_year, first_year), club_id`,
    parameters: [footballerId],
  };
}
