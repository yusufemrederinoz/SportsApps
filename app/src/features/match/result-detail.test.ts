import { describe, expect, it } from 'vitest';

import { resultDetailKey } from './result-detail';

describe('result detail', () => {
  it('names how the match was decided', () => {
    expect(resultDetailKey('line')).toBe('match.byLine');
    expect(resultDetailKey('cells')).toBe('match.byCells');
    expect(resultDetailKey('misses')).toBe('match.byFewerMisses');
    expect(resultDetailKey('second')).toBe('match.bySecondMove');
    expect(resultDetailKey(undefined)).toBe('match.byCells');
  });
});
