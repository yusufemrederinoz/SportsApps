import { describe, expect, it } from 'vitest';

import { nameTokens, normalizeName } from '../src';
import fixture from './fixtures/normalized-names.json';

describe('normalizeName', () => {
  it('matches the data pipeline for every fixture name', () => {
    const mismatches = (fixture as [string, string][])
      .filter(([name, expected]) => normalizeName(name) !== expected)
      .map(([name, expected]) => ({ name, expected, actual: normalizeName(name) }));
    expect(mismatches).toEqual([]);
  });

  it('folds letters that have no decomposition', () => {
    expect(normalizeName('IŞIL ığdır')).toBe('isil igdir');
    expect(normalizeName('Martin Ødegaard')).toBe('martin odegaard');
    expect(normalizeName('Weiß')).toBe('weiss');
  });
});

describe('nameTokens', () => {
  it('splits a search text into normalized tokens', () => {
    expect(nameTokens('  Hakan  Çalhanoğlu ')).toEqual(['hakan', 'calhanoglu']);
    expect(nameTokens(' - ')).toEqual([]);
  });
});
