import type { PlayResult, PlaySide } from './play';

export const TOP_TEN_TURN_SECONDS = 20;

export type TopTenListView =
  | { kind: 'value'; countryId: number }
  | { kind: 'goals'; countryId: number }
  | { kind: 'clubGoals'; clubId: number };

export interface TopTenEntryView {
  rank: number;
  footballerId: number | null;
  value: number | null;
  foundBy: PlaySide | null;
}

export interface TopTenGuessView {
  side: PlaySide;
  footballerId: number | null;
  rank: number | null;
}

export type TopTenViewPhase = 'playing' | 'reveal' | 'finished';

export interface TopTenView {
  phase: TopTenViewPhase;
  round: number;
  totalRounds: number;
  list: TopTenListView;
  entries: TopTenEntryView[];
  turn: PlaySide;
  lives: Record<PlaySide, number>;
  maxLives: number;
  lastGuess: TopTenGuessView | null;
  deadlineIn: number;
  scores: Record<PlaySide, number>;
  result: PlayResult | null;
}
