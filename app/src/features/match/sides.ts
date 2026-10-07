import { opponentOf, type Side } from '@sportapps/game-core';

export function ownSideFirst(side: Side): readonly [Side, Side] {
  return [side, opponentOf(side)];
}

export function ownScoreFirst(scores: Record<Side, number>, side: Side): string {
  return `${scores[side]} – ${scores[opponentOf(side)]}`;
}
