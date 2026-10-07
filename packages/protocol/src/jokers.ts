import type { GameId, PlayCell, PlaySide } from './play';

export const JOKER_PRICE = 3;
export const JOKERS_PER_MATCH = 2;

export const JOKER_IDS = [
  'extra-time',
  'hint',
  'swap-card',
  'see-values',
  'show-assists',
  'pass',
  'reveal-value',
  'club-hint',
  'answer-count',
  'extra-life',
  'first-letter',
  'nationality',
  'position',
] as const;

export type JokerId = (typeof JOKER_IDS)[number];

export const GAME_JOKERS: Readonly<Record<GameId, readonly JokerId[]>> = {
  grid: ['extra-time', 'hint'],
  duel: ['swap-card', 'see-values'],
  draft: ['extra-time', 'show-assists'],
  higher: ['pass', 'reveal-value'],
  chain: ['extra-time', 'club-hint'],
  rare: ['extra-time', 'hint'],
  auction: ['answer-count', 'extra-time'],
  'top-ten': ['extra-life', 'first-letter'],
  career: ['nationality', 'position'],
};

export const EXTRA_TIME_SECONDS: Readonly<Partial<Record<GameId, number>>> = {
  grid: 15,
  draft: 15,
  chain: 10,
  rare: 15,
  auction: 15,
};

export interface JokerTarget {
  cell?: PlayCell;
  footballerId?: number;
}

export type JokerReveal =
  | { kind: 'time'; seconds: number }
  | { kind: 'initials'; footballerId: number; birthYear: boolean }
  | { kind: 'values'; values: Record<number, number | null> }
  | { kind: 'value'; footballerId: number; value: number }
  | { kind: 'club'; clubId: number }
  | { kind: 'count'; count: number }
  | { kind: 'country'; countryId: number | null }
  | { kind: 'position'; position: string | null; birthYear: number | null }
  | { kind: 'swap'; from: number; to: number }
  | { kind: 'assists'; round: number }
  | { kind: 'pass' }
  | { kind: 'life'; lives: number };

export interface JokerUse {
  side: PlaySide;
  joker: JokerId;
  reveal: JokerReveal | null;
}
