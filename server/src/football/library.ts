import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import {
  clubConceptsStatement,
  conceptMembersStatement,
  conceptPlayersStatement,
  correctAnswerStatement,
  countryConceptsStatement,
  draftCandidatesStatement,
  draftClubsStatement,
  draftEntryStatement,
  gridAtOffsetStatement,
  gridCountStatement,
  gridHeadersStatement,
  gridOffset,
  knownAnswersStatement,
  leagueConceptsStatement,
  marketsStatement,
  metricRowsStatement,
  minimumFameStatement,
  nearMissesStatement,
  toGrid,
  type DraftCandidateRow,
  type DraftEntryRow,
  type GridHeaderRow,
  type MetricRow,
  type Statement,
} from '@sportapps/football-data';
import type { BotOption, CellPosition, Grid, Header } from '@sportapps/game-core';
import type { DuelConcept } from '@sportapps/protocol';

const VERSION_FILE = 'version.json';
const KNOWN_ANSWER_LIMIT = 8;
const CONCEPT_FAME = 45;
const CONCEPT_PLAYERS = 25;
const DRAFT_FAME = 32;
const DRAFT_PER_POSITION = 4;

export interface FootballLibrary {
  readonly dataVersion: string;
  hasMarket(market: string): boolean;
  pickGrid(market: string, difficulty: number, random?: () => number): Grid | null;
  isCorrect(footballerId: number, row: Header, column: Header): boolean;
  minimumFame(difficulty: number): number;
  knownAnswers(market: string, grid: Grid, positions: readonly CellPosition[], minimumFame: number): BotOption[];
  nearMisses(market: string, matching: Header, missing: Header, minimumFame: number, limit: number): number[];
  duelConcepts(market: string): readonly DuelConcept[];
  conceptPlayers(concept: DuelConcept, market: string, minimumFame: number, limit: number): number[];
  conceptMembers(concept: DuelConcept, market: string, footballerIds: readonly number[]): number[];
  metricRows(footballerIds: readonly number[]): MetricRow[];
  draftClubs(market: string): readonly number[];
  draftEntry(footballerId: number, clubId: number): DraftEntryRow | null;
  draftCandidates(
    market: string,
    clubId: number,
    positions: readonly string[],
    excludedIds: readonly number[],
    limit: number,
  ): DraftCandidateRow[];
  close(): void;
}

export function readDataVersion(databasePath: string): string {
  const version = JSON.parse(readFileSync(join(dirname(databasePath), VERSION_FILE), 'utf8')) as {
    dataVersion: string;
  };
  return version.dataVersion;
}

export function openFootballLibrary(databasePath: string, dataVersion: string): FootballLibrary {
  const database = new DatabaseSync(databasePath, { readOnly: true });
  const all = <T>({ sql, parameters }: Statement) => database.prepare(sql).all(...parameters) as T[];
  const first = <T>({ sql, parameters }: Statement) => database.prepare(sql).get(...parameters) as T | undefined;
  const markets = new Set(all<{ code: string }>(marketsStatement()).map((market) => market.code));
  const concepts = new Map<string, readonly DuelConcept[]>();
  const draftClubs = new Map<string, readonly number[]>();
  const ids = (statement: Statement) => all<{ id: number }>(statement).map((row) => row.id);

  const loadConcepts = (market: string): DuelConcept[] => {
    const candidates: DuelConcept[] = [
      { kind: 'home-league-foreigners' },
      { kind: 'home-nationals-abroad' },
      ...all<{ code: string }>(leagueConceptsStatement()).map(
        ({ code }): DuelConcept => ({ kind: 'league', leagueCode: code }),
      ),
    ];
    return [
      ...candidates.filter(
        (concept) => ids(conceptPlayersStatement(concept, market, CONCEPT_FAME, CONCEPT_PLAYERS)).length >= CONCEPT_PLAYERS,
      ),
      ...ids(clubConceptsStatement(market, CONCEPT_FAME, CONCEPT_PLAYERS)).map(
        (clubId): DuelConcept => ({ kind: 'club', clubId }),
      ),
      ...ids(countryConceptsStatement(market, CONCEPT_FAME, CONCEPT_PLAYERS)).map(
        (countryId): DuelConcept => ({ kind: 'country', countryId }),
      ),
    ];
  };

  return {
    dataVersion,

    hasMarket(market) {
      return markets.has(market);
    },

    pickGrid(market, difficulty, random = Math.random) {
      const total = first<{ total: number }>(gridCountStatement(market, difficulty))?.total ?? 0;
      if (total === 0) {
        return null;
      }
      const picked = first<{ id: number }>(gridAtOffsetStatement(market, difficulty, gridOffset(total, random)));
      return picked ? toGrid(picked.id, all<GridHeaderRow>(gridHeadersStatement(picked.id))) : null;
    },

    isCorrect(footballerId, row, column) {
      return first<{ correct: number }>(correctAnswerStatement(footballerId, row, column))?.correct === 1;
    },

    minimumFame(difficulty) {
      return first<{ minimumFame: number }>(minimumFameStatement(difficulty))?.minimumFame ?? 0;
    },

    knownAnswers(market, grid, positions, minimumFame) {
      return positions.map((position) => ({
        position,
        footballerIds: all<{ id: number }>(
          knownAnswersStatement(
            market,
            grid.rows[position.row] as Header,
            grid.columns[position.column] as Header,
            minimumFame,
            KNOWN_ANSWER_LIMIT,
          ),
        ).map((row) => row.id),
      }));
    },

    nearMisses(market, matching, missing, minimumFame, limit) {
      return all<{ id: number }>(nearMissesStatement(market, matching, missing, minimumFame, limit)).map(
        (row) => row.id,
      );
    },

    duelConcepts(market) {
      const known = concepts.get(market);
      if (known) {
        return known;
      }
      const loaded = markets.has(market) ? loadConcepts(market) : [];
      concepts.set(market, loaded);
      return loaded;
    },

    conceptPlayers(concept, market, minimumFame, limit) {
      return ids(conceptPlayersStatement(concept, market, minimumFame, limit));
    },

    conceptMembers(concept, market, footballerIds) {
      return footballerIds.length > 0 ? ids(conceptMembersStatement(concept, market, footballerIds)) : [];
    },

    metricRows(footballerIds) {
      return footballerIds.length > 0 ? all<MetricRow>(metricRowsStatement(footballerIds)) : [];
    },

    draftClubs(market) {
      const known = draftClubs.get(market);
      if (known) {
        return known;
      }
      const loaded = markets.has(market) ? ids(draftClubsStatement(market, DRAFT_FAME, DRAFT_PER_POSITION)) : [];
      draftClubs.set(market, loaded);
      return loaded;
    },

    draftEntry(footballerId, clubId) {
      return first<DraftEntryRow>(draftEntryStatement(footballerId, clubId)) ?? null;
    },

    draftCandidates(market, clubId, positions, excludedIds, limit) {
      return all<DraftCandidateRow>(draftCandidatesStatement(market, clubId, positions, excludedIds, limit));
    },

    close() {
      database.close();
    },
  };
}
