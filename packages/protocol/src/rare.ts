import type { PlayResult, PlaySide } from './play';

export const RARE_ANSWER_SECONDS = 30;

export interface PlayHeader {
  kind: 'club' | 'country';
  referenceId: number;
}

export interface RareCriteriaView {
  row: PlayHeader;
  column: PlayHeader;
}

export interface RareAnswerView {
  footballerId: number | null;
  correct: boolean;
  fame: number | null;
}

export interface RareRoundView {
  criteria: RareCriteriaView;
  answers: Record<PlaySide, RareAnswerView>;
  winner: PlaySide | null;
}

export type RareViewPhase = 'answering' | 'reveal' | 'finished';

export interface RareView {
  phase: RareViewPhase;
  round: number;
  totalRounds: number;
  criteria: RareCriteriaView | null;
  answered: Record<PlaySide, boolean>;
  own: number | null;
  rounds: RareRoundView[];
  deadlineIn: number;
  scores: Record<PlaySide, number>;
  result: PlayResult | null;
}

export type RareAction = { kind: 'name'; footballerId: number };
