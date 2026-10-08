import { describe, expect, it } from 'vitest';

import { createThinkingClock, settleByScore } from '../src/play/thinking';

function ticking() {
  let time = 1000;
  return { now: () => time, pass: (milliseconds: number) => (time += milliseconds) };
}

describe('thinking clock', () => {
  it('adds up the time each side spends between being asked and answering', () => {
    const { now, pass } = ticking();
    const clock = createThinkingClock(now);
    clock.start(['x']);
    pass(400);
    clock.stop('x');
    clock.start(['x', 'o']);
    pass(250);
    clock.stop('o');
    pass(100);
    clock.stop('x');
    expect(clock.spent()).toEqual({ x: 750, o: 250 });
  });

  it('keeps running when a side is asked again and ignores a stop that was never started', () => {
    const { now, pass } = ticking();
    const clock = createThinkingClock(now);
    clock.stop('o');
    clock.start(['x']);
    pass(300);
    clock.start(['x']);
    pass(200);
    clock.stop('x');
    clock.stop('x');
    expect(clock.spent()).toEqual({ x: 500, o: 0 });
  });
});

describe('settling a match on points', () => {
  const clockWith = (x: number, o: number) => {
    const { now, pass } = ticking();
    const clock = createThinkingClock(now);
    clock.start(['x']);
    pass(x);
    clock.stop('x');
    clock.start(['o']);
    pass(o);
    clock.stop('o');
    return clock;
  };

  it('keeps the side that leads on points', () => {
    expect(settleByScore('x', clockWith(900, 100), 'o')).toEqual({ winner: 'x', reason: 'score' });
  });

  it('gives a level match to the faster side', () => {
    expect(settleByScore(null, clockWith(900, 100), 'x')).toEqual({ winner: 'o', reason: 'speed' });
    expect(settleByScore(null, clockWith(100, 900), 'o')).toEqual({ winner: 'x', reason: 'speed' });
  });

  it('falls back to the named side when even the times are level', () => {
    expect(settleByScore(null, clockWith(500, 500), 'o')).toEqual({ winner: 'o', reason: 'speed' });
    expect(settleByScore(null, clockWith(500, 500), 'x')).toEqual({ winner: 'x', reason: 'speed' });
  });
});
