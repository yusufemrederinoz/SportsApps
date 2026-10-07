import type { Side } from '@sportapps/game-core';
import type { GameId, JokerId, JokerTarget, JokerUse, PlayErrorCode } from '@sportapps/protocol';
import { createContext } from 'react';

export interface MatchJokers {
  game: GameId;
  side: Side;
  market: string;
  uses: readonly JokerUse[];
  goals: number | null;
  pending: JokerId | null;
  error: PlayErrorCode | null;
  use: (joker: JokerId, target?: JokerTarget) => void;
}

export const JokerContext = createContext<MatchJokers | null>(null);

export function ownReveals(jokers: MatchJokers) {
  return jokers.uses.filter((use) => use.side === jokers.side && use.reveal !== null);
}
