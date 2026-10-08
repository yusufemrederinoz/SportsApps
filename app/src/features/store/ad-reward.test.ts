import { describe, expect, it } from 'vitest';

import { adRowState, awaitAdReward } from './ad-reward';

const before = { goals: 15, remaining: 5, reward: 2 };
const rewarded = { goals: 17, remaining: 4, reward: 2 };
const noWait = () => Promise.resolve();

describe('awaitAdReward', () => {
  it('returns the new balance once the server has written the reward', async () => {
    const answers = [before, before, rewarded];
    let calls = 0;
    const result = await awaitAdReward(() => Promise.resolve(answers[calls++] ?? rewarded), before, noWait);
    expect(result).toEqual(rewarded);
    expect(calls).toBe(3);
  });

  it('keeps checking through failed requests and gives up after the last check', async () => {
    let calls = 0;
    const failing = () => {
      calls += 1;
      return calls === 1 ? Promise.reject(new Error('offline')) : Promise.resolve(before);
    };
    expect(await awaitAdReward(failing, before, noWait, 4)).toBeNull();
    expect(calls).toBe(4);
  });

  it('waits before every check', async () => {
    const waits: number[] = [];
    await awaitAdReward(() => Promise.resolve(before), before, (milliseconds) => {
      waits.push(milliseconds);
      return Promise.resolve();
    }, 2);
    expect(waits).toEqual([1500, 1500]);
  });
});

describe('adRowState', () => {
  it('offers the ad only when it is loaded and the player has watches left', () => {
    expect(adRowState('ready', 3)).toBe('ready');
    expect(adRowState('ready', null)).toBe('busy');
    expect(adRowState('loading', 3)).toBe('busy');
    expect(adRowState('crediting', 3)).toBe('busy');
  });

  it('tells a spent day from a missing ad', () => {
    expect(adRowState('ready', 0)).toBe('spent');
    expect(adRowState('unavailable', 0)).toBe('spent');
    expect(adRowState('unavailable', 2)).toBe('unavailable');
  });
});
