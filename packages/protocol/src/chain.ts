import type { PlayResult, PlaySide } from './play';

export interface ChainLinkView {
  footballerId: number;
  clubId: number | null;
  side: PlaySide | null;
}

export interface ChainMissView {
  side: PlaySide;
  footballerId: number | null;
  reason: 'wrong' | 'used' | 'timeout';
}

export type ChainViewPhase = 'playing' | 'reveal' | 'finished';

export interface ChainView {
  phase: ChainViewPhase;
  round: number;
  roundsToWin: number;
  turn: PlaySide;
  turnSeconds: number;
  chain: ChainLinkView[];
  miss: ChainMissView | null;
  deadlineIn: number;
  scores: Record<PlaySide, number>;
  result: PlayResult | null;
}

export type ChainAction = { kind: 'link'; footballerId: number };
