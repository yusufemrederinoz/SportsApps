import type { DuelConcept, DuelMetric } from '@sportapps/protocol';

import type { Statement, StatementParameter } from './statements';

export interface MetricRow {
  id: number;
  goals: number | null;
  assists: number | null;
  appearances: number | null;
  yellowCards: number | null;
  marketValue: number | null;
  caps: number | null;
  birthYear: number | null;
}

export interface Condition {
  sql: string;
  parameters: StatementParameter[];
}

const HOME_LEAGUE = '(SELECT home_league_code FROM markets WHERE code = ?)';
const HOME_COUNTRY = '(SELECT id FROM countries WHERE code = upper(?))';
const RATE_PRECISION = 100;

function playsInLeague(playerColumn: string, league: string, negate: boolean): string {
  return `EXISTS (SELECT 1 FROM player_clubs pc JOIN clubs c ON c.id = pc.club_id
          WHERE pc.player_id = ${playerColumn} AND c.league_code ${negate ? '<>' : '='} ${league})`;
}

function comparable(playerColumn: string): string {
  return `EXISTS (SELECT 1 FROM player_stats s JOIN players b ON b.id = s.player_id
          WHERE s.player_id = ${playerColumn} AND s.appearances > 0 AND b.birth_year IS NOT NULL)`;
}

function membership(concept: DuelConcept, market: string, playerColumn: string): Condition {
  switch (concept.kind) {
    case 'home-league-foreigners':
      return {
        sql: `${playsInLeague(playerColumn, HOME_LEAGUE, false)} AND EXISTS (SELECT 1 FROM players q
              WHERE q.id = ${playerColumn} AND q.country_id IS NOT NULL AND q.country_id <> ${HOME_COUNTRY})`,
        parameters: [market, market],
      };
    case 'home-nationals-abroad':
      return {
        sql: `${playsInLeague(playerColumn, HOME_LEAGUE, true)} AND EXISTS (SELECT 1 FROM players q
              WHERE q.id = ${playerColumn} AND q.country_id = ${HOME_COUNTRY})`,
        parameters: [market, market],
      };
    case 'club':
      return {
        sql: `EXISTS (SELECT 1 FROM player_clubs pc WHERE pc.player_id = ${playerColumn} AND pc.club_id = ?)`,
        parameters: [concept.clubId],
      };
    case 'country':
      return {
        sql: `EXISTS (SELECT 1 FROM players q WHERE q.id = ${playerColumn} AND q.country_id = ?)`,
        parameters: [concept.countryId],
      };
    case 'league':
      return { sql: playsInLeague(playerColumn, '?', false), parameters: [concept.leagueCode] };
  }
}

export function conceptCondition(concept: DuelConcept, market: string, playerColumn: string): Condition {
  const member = membership(concept, market, playerColumn);
  return { sql: `(${member.sql} AND ${comparable(playerColumn)})`, parameters: member.parameters };
}

export function conceptPlayersStatement(
  concept: DuelConcept,
  market: string,
  minimumFame: number,
  limit: number,
): Statement {
  const condition = conceptCondition(concept, market, 'f.player_id');
  return {
    sql: `SELECT f.player_id AS id FROM player_fame f
          WHERE f.market = ? AND f.fame >= ? AND ${condition.sql}
          ORDER BY f.fame DESC, f.player_id LIMIT ?`,
    parameters: [market, minimumFame, ...condition.parameters, limit],
  };
}

export function conceptMembersStatement(concept: DuelConcept, market: string, playerIds: readonly number[]): Statement {
  const condition = conceptCondition(concept, market, 'p.id');
  return {
    sql: `SELECT p.id FROM players p WHERE p.id IN (${playerIds.map(() => '?').join(', ')}) AND ${condition.sql}`,
    parameters: [...playerIds, ...condition.parameters],
  };
}

export function metricRowsStatement(playerIds: readonly number[]): Statement {
  return {
    sql: `SELECT p.id, s.goals, s.assists, NULLIF(s.appearances, 0) AS appearances, s.yellow_cards AS yellowCards,
                 f.market_value AS marketValue, f.caps, p.birth_year AS birthYear
          FROM players p
          LEFT JOIN player_stats s ON s.player_id = p.id
          LEFT JOIN player_profile f ON f.player_id = p.id
          WHERE p.id IN (${playerIds.map(() => '?').join(', ')})`,
    parameters: [...playerIds],
  };
}

export function metricValue(row: MetricRow, metric: DuelMetric): number | null {
  switch (metric) {
    case 'older':
    case 'younger':
      return row.birthYear;
    case 'goalRate':
      return row.goals === null || row.appearances === null
        ? null
        : Math.round((row.goals / row.appearances) * RATE_PRECISION) / RATE_PRECISION;
    default:
      return row[metric];
  }
}

export function comparablePlayersStatement(market: string, minimumFame: number, limit: number): Statement {
  return {
    sql: `SELECT f.player_id AS id FROM player_fame f
          WHERE f.market = ? AND f.fame >= ? AND ${comparable('f.player_id')}
          ORDER BY f.fame DESC, f.player_id LIMIT ?`,
    parameters: [market, minimumFame, limit],
  };
}

export function clubConceptsStatement(market: string, minimumFame: number, minimumPlayers: number): Statement {
  return {
    sql: `SELECT pc.club_id AS id FROM player_clubs pc
          JOIN player_fame f ON f.player_id = pc.player_id AND f.market = ? AND f.fame >= ?
          WHERE ${comparable('pc.player_id')}
          GROUP BY pc.club_id HAVING COUNT(*) >= ? ORDER BY COUNT(*) DESC, pc.club_id`,
    parameters: [market, minimumFame, minimumPlayers],
  };
}

export function countryConceptsStatement(market: string, minimumFame: number, minimumPlayers: number): Statement {
  return {
    sql: `SELECT p.country_id AS id FROM players p
          JOIN player_fame f ON f.player_id = p.id AND f.market = ? AND f.fame >= ?
          WHERE p.country_id IS NOT NULL AND ${comparable('p.id')}
          GROUP BY p.country_id HAVING COUNT(*) >= ? ORDER BY COUNT(*) DESC, p.country_id`,
    parameters: [market, minimumFame, minimumPlayers],
  };
}

export function leagueConceptsStatement(): Statement {
  return { sql: 'SELECT DISTINCT league_code AS code FROM clubs ORDER BY league_code', parameters: [] };
}
