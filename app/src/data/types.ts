import type { Grid, HeaderKind } from '@sportapps/game-core';

export type QueryParameter = string | number;

export interface QueryRunner {
  getAllAsync<T>(source: string, params: QueryParameter[]): Promise<T[]>;
  getFirstAsync<T>(source: string, params: QueryParameter[]): Promise<T | null>;
}

export interface Market {
  code: string;
  language: string;
}

export type Difficulty = 1 | 2 | 3;

export interface HeaderView {
  kind: HeaderKind;
  referenceId: number;
  name: string;
  countryCode: string | null;
}

export interface GridView {
  grid: Grid;
  rows: readonly [HeaderView, HeaderView, HeaderView];
  columns: readonly [HeaderView, HeaderView, HeaderView];
}

export interface FootballerSummary {
  id: number;
  name: string;
  birthYear: number | null;
  countryCode: string | null;
}
