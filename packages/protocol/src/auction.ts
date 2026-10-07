import type { PlayResult, PlaySide } from './play';
import type { RareCriteriaView } from './rare';

export const AUCTION_BID_SECONDS = 15;
export const AUCTION_PROOF_BASE_SECONDS = 8;
export const AUCTION_PROOF_SECONDS_PER_ANSWER = 5;

export interface AuctionOutcomeView {
  prover: PlaySide;
  bid: number;
  named: number;
  winner: PlaySide;
}

export type AuctionViewPhase = 'bidding' | 'proving' | 'reveal' | 'finished';

export interface AuctionView {
  phase: AuctionViewPhase;
  round: number;
  roundsToWin: number;
  maxBid: number;
  criteria: RareCriteriaView | null;
  turn: PlaySide;
  bid: number;
  bidder: PlaySide | null;
  named: number[];
  missed: number[];
  outcome: AuctionOutcomeView | null;
  phaseSeconds: number;
  deadlineIn: number;
  scores: Record<PlaySide, number>;
  result: PlayResult | null;
}

export type AuctionAction = { kind: 'bid'; amount: number } | { kind: 'challenge' };
