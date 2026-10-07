import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import {
  correctAnswerStatement,
  gridAtOffsetStatement,
  gridCountStatement,
  gridHeadersStatement,
  gridOffset,
  knownAnswersStatement,
  marketsStatement,
  minimumFameStatement,
  nearMissesStatement,
  toGrid,
  type GridHeaderRow,
  type Statement,
} from '@sportapps/football-data';
import type { BotOption, CellPosition, Grid, Header } from '@sportapps/game-core';

const VERSION_FILE = 'version.json';
const KNOWN_ANSWER_LIMIT = 8;

export interface FootballLibrary {
  readonly dataVersion: string;
  hasMarket(market: string): boolean;
  pickGrid(market: string, difficulty: number, random?: () => number): Grid | null;
  isCorrect(footballerId: number, row: Header, column: Header): boolean;
  minimumFame(difficulty: number): number;
  knownAnswers(market: string, grid: Grid, positions: readonly CellPosition[], minimumFame: number): BotOption[];
  nearMisses(market: string, matching: Header, missing: Header, minimumFame: number, limit: number): number[];
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

    close() {
      database.close();
    },
  };
}
