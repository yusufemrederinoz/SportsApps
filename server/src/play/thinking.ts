import type { Side } from '@sportapps/game-core';
import type { PlayResult } from '@sportapps/protocol';

export interface ThinkingClock {
  start(sides: readonly Side[]): void;
  stop(side: Side): void;
  spent(): Record<Side, number>;
}

export function createThinkingClock(now: () => number): ThinkingClock {
  const spent: Record<Side, number> = { x: 0, o: 0 };
  const since: Partial<Record<Side, number>> = {};
  return {
    start(sides) {
      const time = now();
      sides.forEach((side) => {
        since[side] ??= time;
      });
    },
    stop(side) {
      const from = since[side];
      if (from !== undefined) {
        spent[side] += now() - from;
        delete since[side];
      }
    },
    spent: () => ({ ...spent }),
  };
}

export function settleByScore(leader: Side | null, clock: ThinkingClock, fallback: Side): PlayResult {
  if (leader) {
    return { winner: leader, reason: 'score' };
  }
  const { x, o } = clock.spent();
  return { winner: x === o ? fallback : x < o ? 'x' : 'o', reason: 'speed' };
}
