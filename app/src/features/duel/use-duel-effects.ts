import type { Side } from '@sportapps/game-core';
import type { DuelView } from '@sportapps/protocol';
import { useEffect } from 'react';

import { URGENT_SECONDS } from '@/features/match/use-match-effects';
import { haptics } from '@/feedback/haptics';
import { playSound } from '@/feedback/sounds';

export function useDuelEffects(view: DuelView, side: Side, secondsLeft: number) {
  const { phase, result } = view;
  const rounds = view.rounds.length;
  const lastWinner = view.rounds.at(-1)?.winner ?? null;
  const dealt = view.hand !== null;
  const waitingOnPlayer = phase === 'picking' ? !dealt : phase === 'playing' && view.played === null;

  useEffect(() => {
    playSound('whistle');
  }, []);

  useEffect(() => {
    if (phase === 'playing') {
      playSound('whoosh');
    }
  }, [phase, rounds]);

  useEffect(() => {
    if (rounds === 0) {
      return;
    }
    playSound('impact');
    if (lastWinner === null) {
      haptics.warning();
    } else if (lastWinner === side) {
      haptics.success();
      playSound('correct');
    } else {
      haptics.error();
      playSound('wrong');
    }
  }, [rounds, lastWinner, side]);

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
    if (waitingOnPlayer && secondsLeft > 0 && secondsLeft <= URGENT_SECONDS) {
      haptics.tick();
      playSound('tick');
    }
  }, [waitingOnPlayer, secondsLeft]);
}
