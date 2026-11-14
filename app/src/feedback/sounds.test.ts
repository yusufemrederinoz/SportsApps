import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-audio', () => ({ createAudioPlayer: vi.fn() }));

const { pickVariant } = await import('./sounds');

describe('sound variants', () => {
  it('always plays the only file of a single sound', () => {
    expect(pickVariant(1, undefined, () => 0.9)).toBe(0);
    expect(pickVariant(1, 0, () => 0.9)).toBe(0);
  });

  it('never repeats the previous variant back to back', () => {
    for (let previous = 0; previous < 3; previous += 1) {
      for (const roll of [0, 0.3, 0.49, 0.5, 0.99]) {
        const variant = pickVariant(3, previous, () => roll);
        expect(variant).not.toBe(previous);
        expect(variant).toBeGreaterThanOrEqual(0);
        expect(variant).toBeLessThan(3);
      }
    }
  });

  it('reaches every variant', () => {
    const seen = new Set([0, 0.5, 0.99].map((roll) => pickVariant(3, undefined, () => roll)));
    expect(seen).toEqual(new Set([0, 1, 2]));
    const afterFirst = new Set([0, 0.99].map((roll) => pickVariant(3, 0, () => roll)));
    expect(afterFirst).toEqual(new Set([1, 2]));
  });
});
