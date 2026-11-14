import type { DraftMetric } from '@sportapps/protocol';
import type { TFunction } from 'i18next';

import { metricValueText } from '@/features/duel/labels';

const VALUE_KEYS = {
  goals: 'draft.valueGoals',
  assists: 'draft.valueAssists',
  appearances: 'draft.valueAppearances',
  marketValue: null,
} as const satisfies Record<DraftMetric, string | null>;

export function draftValueText(t: TFunction, metric: DraftMetric, value: number | null, language: string): string {
  const amount = metricValueText(t, metric, value, language);
  const key = VALUE_KEYS[metric];
  return key && value !== null ? t(key, { value: amount }) : amount;
}
