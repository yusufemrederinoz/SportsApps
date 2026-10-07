import type { DuelConcept, DuelMetric } from '@sportapps/protocol';
import type { TFunction } from 'i18next';

import type { ConceptLabel } from '@/data/types';

const SLOT = '{}';
const MILLION = 1_000_000;
const THOUSAND = 1000;

const LEAGUE_KEYS = {
  TR1: 'leagues.TR1',
  GB1: 'leagues.GB1',
  ES1: 'leagues.ES1',
  IT1: 'leagues.IT1',
  L1: 'leagues.L1',
  FR1: 'leagues.FR1',
} as const;

export const QUESTION_KEYS = {
  goals: 'duel.questionGoals',
  assists: 'duel.questionAssists',
  appearances: 'duel.questionAppearances',
  yellowCards: 'duel.questionYellowCards',
  goalRate: 'duel.questionGoalRate',
  marketValue: 'duel.questionMarketValue',
  caps: 'duel.questionCaps',
  older: 'duel.questionOlder',
  younger: 'duel.questionYounger',
} as const satisfies Record<DuelMetric, string>;

export const METRIC_KEYS = {
  goals: 'duel.metricGoals',
  assists: 'duel.metricAssists',
  appearances: 'duel.metricAppearances',
  yellowCards: 'duel.metricYellowCards',
  goalRate: 'duel.metricGoalRate',
  marketValue: 'duel.metricMarketValue',
  caps: 'duel.metricCaps',
  older: 'duel.metricBirthYear',
  younger: 'duel.metricBirthYear',
} as const satisfies Record<DuelMetric, string>;

export interface Casing {
  uppercase: (text: string) => string;
  nameUppercase: (name: string, local: boolean) => string;
}

export function leagueName(t: TFunction, code: string | null): string | null {
  if (!code) {
    return null;
  }
  return code in LEAGUE_KEYS ? t(LEAGUE_KEYS[code as keyof typeof LEAGUE_KEYS]) : code;
}

function fill(template: string, name: string, casing: Casing): string {
  return template.split(SLOT).map(casing.uppercase).join(name);
}

export function conceptTitle(t: TFunction, concept: DuelConcept, label: ConceptLabel | null, casing: Casing): string {
  const league = leagueName(t, label?.leagueCode ?? null);
  const local = label?.local ?? false;
  switch (concept.kind) {
    case 'home-league-foreigners':
      return league
        ? fill(t('duel.conceptHomeLeagueForeigners', { name: SLOT }), casing.nameUppercase(league, local), casing)
        : casing.uppercase(t('duel.conceptForeigners'));
    case 'home-nationals-abroad':
      return casing.uppercase(t('duel.conceptHomeNationalsAbroad'));
    case 'club':
      return fill(t('duel.conceptClub', { name: SLOT }), casing.nameUppercase(label?.name ?? '', local), casing);
    case 'country':
      return fill(t('duel.conceptCountry', { name: SLOT }), casing.nameUppercase(label?.name ?? '', local), casing);
    case 'league':
      return fill(t('duel.conceptLeague', { name: SLOT }), casing.nameUppercase(league ?? '', local), casing);
  }
}

function decimal(value: number, language: string, digits: number): string {
  return value.toLocaleString(language, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function metricValueText(t: TFunction, metric: DuelMetric, value: number | null, language: string): string {
  if (value === null) {
    return t('duel.valueUnknown');
  }
  switch (metric) {
    case 'goalRate':
      return decimal(value, language, 2);
    case 'marketValue':
      return value >= MILLION
        ? t('duel.valueMillions', { value: decimal(value / MILLION, language, value % MILLION === 0 ? 0 : 1) })
        : t('duel.valueThousands', { value: decimal(value / THOUSAND, language, 0) });
    case 'older':
    case 'younger':
      return String(value);
    default:
      return value.toLocaleString(language);
  }
}
