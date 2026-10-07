import type { DuelMetric, JokerReveal } from '@sportapps/protocol';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { loadClubLabel, loadFootballer, loadHeaderLabel } from '@/data/queries';
import { metricValueText } from '@/features/duel/labels';

import { initialsOf, surnameOf } from './initials';

const ROLE_KEYS = { GK: 'jokers.roleGK', DF: 'jokers.roleDF', MF: 'jokers.roleMF', FW: 'jokers.roleFW' } as const;


export function useRevealText(reveal: JokerReveal, market: string, metric: DuelMetric | null): string | null {
  const database = useSQLiteContext();
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const key = JSON.stringify(reveal);
  const [text, setText] = useState<{ key: string; value: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const format = (value: number | null) =>
      metric ? metricValueText(t, metric, value, language) : value === null ? t('jokers.unknown') : String(value);
    const describe = async (): Promise<string> => {
      switch (reveal.kind) {
        case 'time':
          return t('jokers.time', { seconds: reveal.seconds });
        case 'initials': {
          const footballer = await loadFootballer(database, reveal.footballerId);
          const initials = initialsOf(footballer?.name ?? '?');
          return reveal.birthYear && footballer?.birthYear
            ? t('jokers.initialsYear', { initials, year: footballer.birthYear })
            : t('jokers.initials', { initials });
        }
        case 'values': {
          const entries = await Promise.all(
            Object.entries(reveal.values).map(async ([id, value]) => {
              const footballer = await loadFootballer(database, Number(id));
              return `${surnameOf(footballer?.name ?? '?')} ${format(value)}`;
            }),
          );
          return `${t('jokers.values')}: ${entries.join(' · ')}`;
        }
        case 'value': {
          const footballer = await loadFootballer(database, reveal.footballerId);
          return t('jokers.value', { name: footballer?.name ?? '?', value: format(reveal.value) });
        }
        case 'club': {
          const club = await loadClubLabel(database, reveal.clubId, market, language);
          return t('jokers.club', { name: club.name });
        }
        case 'count':
          return t('jokers.count', { amount: reveal.count });
        case 'country': {
          if (reveal.countryId === null) {
            return t('jokers.country', { name: t('jokers.unknown') });
          }
          const country = await loadHeaderLabel(database, { kind: 'country', referenceId: reveal.countryId }, market, language);
          return t('jokers.country', { name: country.name });
        }
        case 'position': {
          const role = reveal.position && reveal.position in ROLE_KEYS ? ROLE_KEYS[reveal.position as keyof typeof ROLE_KEYS] : null;
          const position = role ? t(role) : t('jokers.unknown');
          return reveal.birthYear
            ? t('jokers.positionYear', { position, year: reveal.birthYear })
            : t('jokers.positionOnly', { position });
        }
        case 'swap': {
          const [from, to] = await Promise.all([loadFootballer(database, reveal.from), loadFootballer(database, reveal.to)]);
          return t('jokers.swap', { from: from?.name ?? '?', to: to?.name ?? '?' });
        }
        case 'assists':
          return t('jokers.assists');
        case 'pass':
          return t('jokers.passed');
        case 'life':
          return t('jokers.life', { lives: reveal.lives });
      }
    };
    void describe().then((value) => {
      if (!cancelled) {
        setText({ key, value });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [database, key, language, market, metric, reveal, t]);

  return text?.key === key ? text.value : null;
}
