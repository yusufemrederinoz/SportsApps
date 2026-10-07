import type { DuelMetric, MetricPreference } from './duel';
import type { PlayResult, PlaySide } from './play';

export const HIGHER_ANSWER_SECONDS = 10;

export const HIGHER_METRICS = [
  'goals',
  'assists',
  'appearances',
  'marketValue',
  'caps',
  'older',
  'younger',
] as const satisfies readonly DuelMetric[];

export type HigherMetric = (typeof HIGHER_METRICS)[number];

export interface HigherQuestionView {
  metric: HigherMetric;
  prefer: MetricPreference;
  cards: [number, number];
}

export interface HigherAnswerView {
  side: PlaySide;
  question: HigherQuestionView;
  values: [number, number];
  choice: number | null;
  correct: boolean;
}

export type HigherViewPhase = 'answering' | 'reveal' | 'finished';

export interface HigherView {
  phase: HigherViewPhase;
  turn: PlaySide;
  inning: number;
  totalInnings: number;
  streak: number;
  streakLimit: number;
  question: HigherQuestionView | null;
  last: HigherAnswerView | null;
  deadlineIn: number;
  scores: Record<PlaySide, number>;
  result: PlayResult | null;
}

export type HigherAction = { kind: 'choose'; footballerId: number };
