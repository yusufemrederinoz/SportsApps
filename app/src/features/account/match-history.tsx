import type { MatchOutcome, MatchSummary } from '@sportapps/protocol';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { api } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { GAME_LABELS, parseGame } from '@/features/games';
import { DIFFICULTY_LABELS } from '@/features/match/difficulty';
import { useUppercase } from '@/i18n/uppercase';

const VISIBLE_MATCHES = 12;

const OUTCOME_KEYS = {
  win: 'account.historyWin',
  loss: 'account.historyLoss',
  draw: 'account.historyDraw',
} as const satisfies Record<MatchOutcome, string>;

const OUTCOME_COLORS: Record<MatchOutcome, ThemeColor> = {
  win: 'positive',
  loss: 'negative',
  draw: 'gold',
};

export function MatchHistory({ token }: { token: string }) {
  const { t, i18n } = useTranslation();
  const uppercase = useUppercase();
  const [matches, setMatches] = useState<MatchSummary[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      api
        .matches(token)
        .then((response) => {
          if (!cancelled) {
            setMatches(response.matches.slice(0, VISIBLE_MATCHES));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setMatches((current) => current ?? []);
          }
        });
      return () => {
        cancelled = true;
      };
    }, [token]),
  );

  const playedOn = (finishedAt: number) =>
    new Date(finishedAt).toLocaleString(i18n.language, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <View style={styles.section}>
      <ThemedText type="label" themeColor="textSecondary">
        {uppercase(t('account.historyTitle'))}
      </ThemedText>
      {matches?.length === 0 ? <ThemedText themeColor="textSecondary">{t('account.historyEmpty')}</ThemedText> : null}
      {matches?.map((match) => {
        const color = Colors[OUTCOME_COLORS[match.outcome]];
        return (
          <View
            key={match.id}
            style={styles.row}
            accessible
            accessibilityLabel={`${t(OUTCOME_KEYS[match.outcome])}, ${match.opponent}, ${match.ownCells} – ${match.opponentCells}`}>
            <View style={[styles.mark, { backgroundColor: color }]} />
            <View style={styles.texts}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {match.opponent}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {`${t(GAME_LABELS[parseGame(match.game)])} · ${t(DIFFICULTY_LABELS[match.difficulty])} · ${playedOn(match.finishedAt)}`}
              </ThemedText>
            </View>
            <View style={styles.result}>
              <ThemedText type="smallBold" style={[styles.right, { color }]}>
                {uppercase(t(OUTCOME_KEYS[match.outcome]))}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.right}>
                {`${match.ownCells} – ${match.opponentCells}`}
              </ThemedText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.stroke,
    backgroundColor: Colors.panel,
  },
  mark: {
    width: 6,
    alignSelf: 'stretch',
    borderRadius: 3,
  },
  texts: {
    flex: 1,
    gap: Spacing.half,
  },
  result: {
    minWidth: 96,
    gap: Spacing.half,
  },
  right: {
    textAlign: 'right',
  },
});
