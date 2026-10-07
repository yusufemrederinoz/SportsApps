import type { DuelView } from '@sportapps/protocol';
import { DUEL_METRICS } from '@sportapps/protocol';
import { createInstance, type TFunction } from 'i18next';
import { beforeAll, describe, expect, it } from 'vitest';

import { resources } from '@/i18n/languages';

import { METRIC_KEYS, QUESTION_KEYS, conceptTitle, leagueName, metricValueText, type Casing } from './labels';
import { duelCardIds, finishDuelView } from './online';

let turkish: TFunction;
let english: TFunction;

const casingFor = (language: string): Casing => ({
  uppercase: (text) => text.toLocaleUpperCase(language),
  nameUppercase: (name, local) => (local ? name.toLocaleUpperCase(language) : name.toUpperCase()),
});

beforeAll(async () => {
  const instance = createInstance();
  await instance.init({ resources, lng: 'tr', fallbackLng: 'en', interpolation: { escapeValue: false } });
  turkish = instance.getFixedT('tr');
  english = instance.getFixedT('en');
});

describe('concept titles', () => {
  it('names the home league and keeps local casing for it', () => {
    const title = conceptTitle(
      turkish,
      { kind: 'home-league-foreigners' },
      { name: null, leagueCode: 'TR1', local: true },
      casingFor('tr'),
    );
    expect(title).toBe('SÜPER LİG TARİHİNDEKİ YABANCILAR');
  });

  it('does not bend a foreign name to local casing rules', () => {
    const casing = casingFor('tr');
    expect(conceptTitle(turkish, { kind: 'club', clubId: 1 }, { name: 'Liverpool FC', leagueCode: null, local: false }, casing)).toBe(
      'LIVERPOOL FC FORMASI GİYMİŞ OYUNCULAR',
    );
    expect(conceptTitle(turkish, { kind: 'league', leagueCode: 'GB1' }, { name: null, leagueCode: 'GB1', local: false }, casing)).toBe(
      'PREMIER LEAGUE OYUNCULARI',
    );
    expect(conceptTitle(turkish, { kind: 'country', countryId: 1 }, { name: 'Brezilya', leagueCode: null, local: true }, casing)).toBe(
      'BREZİLYA FUTBOLCULARI',
    );
  });

  it('has a title for every kind in both languages', () => {
    const label = { name: 'Chelsea FC', leagueCode: 'GB1', local: false };
    for (const [translate, language] of [
      [turkish, 'tr'],
      [english, 'en'],
    ] as const) {
      for (const concept of [
        { kind: 'home-league-foreigners' },
        { kind: 'home-nationals-abroad' },
        { kind: 'club', clubId: 1 },
        { kind: 'country', countryId: 1 },
        { kind: 'league', leagueCode: 'GB1' },
      ] as const) {
        const title = conceptTitle(translate, concept, label, casingFor(language));
        expect(title.length).toBeGreaterThan(8);
        expect(title).not.toContain('{}');
        expect(title).not.toContain('duel.');
      }
    }
    expect(conceptTitle(english, { kind: 'home-league-foreigners' }, null, casingFor('en'))).toBe('FOREIGNERS IN THE HOME LEAGUE');
  });

  it('falls back to the code of a league it has no name for', () => {
    expect(leagueName(english, 'NL1')).toBe('NL1');
    expect(leagueName(english, null)).toBeNull();
  });
});

describe('metric texts', () => {
  it('has a question and a label for every metric', () => {
    for (const metric of DUEL_METRICS) {
      expect(turkish(QUESTION_KEYS[metric])).not.toContain('duel.');
      expect(english(METRIC_KEYS[metric])).not.toContain('duel.');
    }
  });

  it('formats values the way each metric is read', () => {
    expect(metricValueText(english, 'goals', 1234, 'en')).toBe('1,234');
    expect(metricValueText(english, 'goalRate', 0.5, 'en')).toBe('0.50');
    expect(metricValueText(english, 'marketValue', 120_000_000, 'en')).toBe('€120M');
    expect(metricValueText(english, 'marketValue', 7_500_000, 'en')).toBe('€7.5M');
    expect(metricValueText(english, 'marketValue', 450_000, 'en')).toBe('€450K');
    expect(metricValueText(turkish, 'marketValue', 120_000_000, 'tr')).toBe('120 mn €');
    expect(metricValueText(english, 'older', 1987, 'en')).toBe('1987');
    expect(metricValueText(english, 'caps', null, 'en')).toBe('?');
  });
});

describe('duel views', () => {
  const view: DuelView = {
    phase: 'reveal',
    concept: { kind: 'home-nationals-abroad' },
    handSize: 7,
    totalRounds: 7,
    deadlineIn: 3000,
    hand: [1, 2, 3],
    opponentReady: true,
    remaining: [2, 3],
    opponentRemaining: 2,
    question: null,
    played: null,
    opponentPlayed: false,
    rounds: [{ metric: 'goals', prefer: 'high', cards: { x: 1, o: 9 }, values: { x: 5, o: 3 }, winner: 'x' }],
    scores: { x: 1, o: 0 },
    result: null,
  };

  it('collects every card a view shows, once', () => {
    expect(duelCardIds(view).sort((first, second) => first - second)).toEqual([1, 2, 3, 9]);
    expect(duelCardIds({ ...view, hand: null, remaining: [], rounds: [], played: 4 })).toEqual([4]);
  });

  it('closes a view with the result unless it already has one', () => {
    const finished = finishDuelView(view, { winner: 'o', reason: 'forfeit' });
    expect(finished).toMatchObject({ phase: 'finished', result: { winner: 'o', reason: 'forfeit' }, deadlineIn: 0 });
    expect(finishDuelView(finished, { winner: 'x', reason: 'score' })).toBe(finished);
  });
});
