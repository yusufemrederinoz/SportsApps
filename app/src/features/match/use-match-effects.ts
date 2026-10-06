import type { Side } from '@sportapps/game-core';
import { useEffect } from 'react';

import { haptics } from '@/feedback/haptics';
import { playSound } from '@/feedback/sounds';

import type { MatchSession } from './session';

export const URGENT_SECONDS = 5;

export function useMatchEffects(session: MatchSession | null, secondsLeft: number, opponentSide: Side | null) {
  const gridId = session?.match.grid.id ?? null;
  const feedback = session?.feedback ?? null;
  const result = session?.match.result ?? null;
  const running = session !== null && result === null;

  useEffect(() => {
    if (gridId !== null) {
      playSound('whistle');
    }
  }, [gridId]);

  useEffect(() => {
    if (!feedback) {
      return;
    }
    if (feedback.kind === 'correct') {
      if (feedback.side === opponentSide) {
        haptics.tick();
        playSound('tick');
      } else {
        haptics.success();
        playSound('correct');
      }
    } else if (feedback.kind === 'wrong' || feedback.kind === 'already-used') {
      haptics.error();
      playSound('wrong');
    } else {
      haptics.warning();
    }
  }, [feedback, opponentSide]);

  useEffect(() => {
    if (!result) {
      return;
    }
    if (result.winner !== null && result.winner !== opponentSide) {
      haptics.celebrate();
      playSound('win');
    } else {
      playSound('whistle');
    }
  }, [result, opponentSide]);

  useEffect(() => {
    if (running && secondsLeft > 0 && secondsLeft <= URGENT_SECONDS) {
      haptics.tick();
      playSound('tick');
    }
  }, [running, secondsLeft]);
}
