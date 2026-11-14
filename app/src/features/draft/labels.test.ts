import { DRAFT_METRICS } from '@sportapps/protocol';
import { createInstance, type TFunction } from 'i18next';
import { beforeAll, describe, expect, it } from 'vitest';

import { resources } from '@/i18n/languages';

import { draftValueText } from './labels';

let turkish: TFunction;
let english: TFunction;
let fixed: (language: string) => TFunction;

beforeAll(async () => {
  const instance = createInstance();
  await instance.init({ resources, lng: 'tr', fallbackLng: 'en', interpolation: { escapeValue: false } });
  turkish = instance.getFixedT('tr');
  english = instance.getFixedT('en');
  fixed = (language) => instance.getFixedT(language);
});

describe('draft values', () => {
  it('names the stat next to the number in every language', () => {
    expect(draftValueText(turkish, 'goals', 134, 'tr')).toBe('134 gol');
    expect(draftValueText(turkish, 'appearances', 1234, 'tr')).toBe('1.234 maç');
    expect(draftValueText(english, 'assists', 1, 'en')).toBe('Assists 1');
    expect(draftValueText(turkish, 'marketValue', 35_000_000, 'tr')).toBe('35 mn €');
    expect(draftValueText(english, 'goals', null, 'en')).toBe('?');
    for (const language of Object.keys(resources)) {
      for (const metric of DRAFT_METRICS) {
        expect(draftValueText(fixed(language), metric, 12, language)).not.toContain('draft.');
      }
    }
  });
});
