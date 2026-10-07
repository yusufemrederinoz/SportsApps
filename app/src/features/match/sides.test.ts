import { describe, expect, it } from 'vitest';

import { ownScoreFirst, ownSideFirst } from '@/features/match/sides';

describe('own side first', () => {
  it('puts the player before the rival', () => {
    expect(ownSideFirst('x')).toEqual(['x', 'o']);
    expect(ownSideFirst('o')).toEqual(['o', 'x']);
  });

  it('reads the score from the player side', () => {
    expect(ownScoreFirst({ x: 2, o: 1 }, 'x')).toBe('2 – 1');
    expect(ownScoreFirst({ x: 2, o: 1 }, 'o')).toBe('1 – 2');
  });
});
