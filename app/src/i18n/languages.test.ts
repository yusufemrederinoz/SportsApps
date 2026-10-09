import { describe, expect, it } from 'vitest';

import { FALLBACK_LANGUAGE, resolveLanguage, resources } from './languages';

function keyPaths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) {
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key));
}

function placeholders(value: unknown): string[] {
  if (typeof value === 'string') {
    return [...value.matchAll(/{{\s*(\w+)\s*}}/g)].map((match) => match[1] ?? '').sort();
  }
  if (typeof value !== 'object' || value === null) {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) => placeholders(child).map((name) => `${key}:${name}`));
}

describe('resolveLanguage', () => {
  it('picks the first supported device language', () => {
    expect(resolveLanguage(['pt', 'tr', 'en'])).toBe('tr');
    expect(resolveLanguage(['de', 'tr', 'en'])).toBe('de');
    expect(resolveLanguage(['en', 'tr'])).toBe('en');
  });

  it('falls back when no device language is supported', () => {
    expect(resolveLanguage(['pt', null])).toBe(FALLBACK_LANGUAGE);
    expect(resolveLanguage([])).toBe(FALLBACK_LANGUAGE);
  });
});

describe('locale files', () => {
  const reference = resources[FALLBACK_LANGUAGE].translation;

  it.each(Object.entries(resources))('%s has the same keys as the fallback language', (_, { translation }) => {
    expect(keyPaths(translation).sort()).toEqual(keyPaths(reference).sort());
  });

  it.each(Object.entries(resources))('%s uses the same placeholders as the fallback language', (_, { translation }) => {
    expect(placeholders(translation).sort()).toEqual(placeholders(reference).sort());
  });
});
