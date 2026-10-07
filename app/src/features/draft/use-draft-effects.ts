import type { Side } from '@sportapps/game-core';
import type { DraftView } from '@sportapps/protocol';
import { useEffect } from 'react';

import { URGENT_SECONDS } from '@/features/match/use-match-effects';
import { haptics } from '@/feedback/haptics';
import { playSound } from '@/feedback/sounds';

function filled(view: DraftView, side: Side): number {
  return view.lineups[side].filter((slot) => slot.footballerId !== null).length;
}

export function useDraftEffects(view: DraftView, side: Side, secondsLeft: number) {
  const rival = side === 'x' ? 'o' : 'x';
  const { round, phase, result } = view;
  const own = filled(view, side);
  const theirs = filled(view, rival);
  const waiting = phase === 'playing' && !view.picked[side];

  useEffect(() => {
    playSound('whistle');
  }, []);

  useEffect(() => {
    if (phase === 'playing') {
      playSound('whoosh');
    }
  }, [phase, round]);

  useEffect(() => {
    if (own > 0) {
      playSound('impact');
      haptics.success();
    }
  }, [own]);

  useEffect(() => {
    if (theirs > 0) {
      playSound('tick');
      haptics.tick();
    }
  }, [theirs]);

  useEffect(() => {
    if (!result) {
      return;
    }
    if (result.winner === side) {
      haptics.celebrate();
      playSound('win');
    } else {
      playSound('whistle');
    }
  }, [result, side]);

  useEffect(() => {
    if (waiting && secondsLeft > 0 && secondsLeft <= URGENT_SECONDS) {
      haptics.tick();
      playSound('tick');
    }
  }, [waiting, secondsLeft]);
}
