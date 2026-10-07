import type { PlayResult, PlaySide } from './play';

export const DRAFT_PICK_SECONDS = 30;

export type DraftPositionCode = 'GK' | 'DF' | 'MF' | 'FW';

export const DRAFT_METRICS = ['assists'] as const;

export type DraftMetric = (typeof DRAFT_METRICS)[number];

export interface DraftSlotView {
  position: DraftPositionCode;
  footballerId: number | null;
  value: number | null;
  round: number | null;
}

export type DraftViewPhase = 'playing' | 'pause' | 'finished';

export interface DraftView {
  phase: DraftViewPhase;
  metric: DraftMetric;
  totalRounds: number;
  round: number;
  clubs: number[];
  deadlineIn: number;
  lineups: Record<PlaySide, DraftSlotView[]>;
  picked: Record<PlaySide, boolean>;
  scores: Record<PlaySide, number>;
  result: PlayResult | null;
}

export type DraftAction = { kind: 'pick'; footballerId: number };
