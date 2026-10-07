import type { PlayResult, PlaySide } from './play';

export type DuelConcept =
  | { kind: 'home-league-foreigners' }
  | { kind: 'home-nationals-abroad' }
  | { kind: 'club'; clubId: number }
  | { kind: 'country'; countryId: number }
  | { kind: 'league'; leagueCode: string };

export const DUEL_METRICS = [
  'goals',
  'assists',
  'appearances',
  'yellowCards',
  'goalRate',
  'marketValue',
  'caps',
  'older',
  'younger',
] as const;

export type DuelMetric = (typeof DUEL_METRICS)[number];

export type MetricPreference = 'high' | 'low';

export const METRIC_PREFERENCES: Readonly<Record<DuelMetric, MetricPreference>> = {
  goals: 'high',
  assists: 'high',
  appearances: 'high',
  yellowCards: 'high',
  goalRate: 'high',
  marketValue: 'high',
  caps: 'high',
  older: 'low',
  younger: 'high',
};

export interface DuelQuestionView {
  metric: DuelMetric;
  prefer: MetricPreference;
}

export interface DuelRoundView extends DuelQuestionView {
  cards: Record<PlaySide, number>;
  values: Record<PlaySide, number | null>;
  winner: PlaySide | null;
}

export type DuelViewPhase = 'picking' | 'playing' | 'reveal' | 'finished';

export interface DuelView {
  phase: DuelViewPhase;
  concept: DuelConcept;
  handSize: number;
  totalRounds: number;
  deadlineIn: number;
  hand: number[] | null;
  opponentReady: boolean;
  remaining: number[];
  opponentRemaining: number;
  question: DuelQuestionView | null;
  played: number | null;
  opponentPlayed: boolean;
  rounds: DuelRoundView[];
  scores: Record<PlaySide, number>;
  result: PlayResult | null;
}

export type DuelAction = { kind: 'hand'; footballerIds: number[] } | { kind: 'play'; footballerId: number };
