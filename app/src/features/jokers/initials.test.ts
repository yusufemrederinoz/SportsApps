import { describe, expect, it } from 'vitest';

import { initialsOf, surnameOf } from '@/features/jokers/initials';

describe('joker hints', () => {
  it('turns a name into initials without giving the name away', () => {
    expect(initialsOf('Mauro Icardi')).toBe('M. I.');
    expect(initialsOf('Çağlar Söyüncü')).toBe('Ç. S.');
    expect(initialsOf('  Alex ')).toBe('A.');
  });

  it('shortens a name to its last word for value lists', () => {
    expect(surnameOf('Lamine Yamal')).toBe('Yamal');
    expect(surnameOf('Rodri')).toBe('Rodri');
  });
});
