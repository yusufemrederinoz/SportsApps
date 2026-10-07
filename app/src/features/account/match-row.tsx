import type { MatchKind, MatchOutcome, MatchSummary } from '@sportapps/protocol';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { GoalIcon } from '@/components/goal-icon';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { GAME_LABELS, parseGame } from '@/features/games';
import { DIFFICULTY_LABELS } from '@/features/match/difficulty';
import { signed } from '@/features/match/match-reward';
import { useUppercase } from '@/i18n/uppercase';

export const OUTCOME_KEYS = {
  win: 'account.historyWin',
  loss: 'account.historyLoss',
  draw: 'account.historyDraw',
} as const satisfies Record<MatchOutcome, string>;

const OUTCOME_COLORS: Record<MatchOutcome, ThemeColor> = {
  win: 'positive',
  loss: 'negative',
  draw: 'gold',
};

const KIND_KEYS = {
  queue: 'history.kindQueue',
  bot: 'history.kindBot',
  room: 'history.kindRoom',
} as const satisfies Record<MatchKind, string>;

export function MatchRow({ match }: { match: MatchSummary }) {
  const { t, i18n } = useTranslation();
  const uppercase = useUppercase();
  const color = Colors[OUTCOME_COLORS[match.outcome]];
  const playedOn = new Date(match.finishedAt).toLocaleString(i18n.language, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const points = match.pointsChange;
  const details = [
    t(KIND_KEYS[match.kind]),
    t(DIFFICULTY_LABELS[match.difficulty]),
    ...(match.reason === 'forfeit' ? [t('history.forfeit')] : []),
    playedOn,
  ].join(' · ');
  const pointsLabel = points === null ? t('history.unranked') : t('reward.points', { value: signed(points) });

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${t(GAME_LABELS[parseGame(match.game)])}, ${t(OUTCOME_KEYS[match.outcome])}, ${match.opponent}, ${match.ownCells} – ${match.opponentCells}, ${pointsLabel}`}>
      <View style={[styles.mark, { backgroundColor: color }]} />
      <View style={styles.texts}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {`${t(GAME_LABELS[parseGame(match.game)])} · ${match.opponent}`}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {details}
        </ThemedText>
      </View>
      <View style={styles.result}>
        <ThemedText type="smallBold" style={[styles.right, { color }]}>
          {`${uppercase(t(OUTCOME_KEYS[match.outcome]))} ${match.ownCells}–${match.opponentCells}`}
        </ThemedText>
        <View style={styles.rewards}>
          {match.goalsEarned > 0 ? (
            <View style={styles.goal}>
              <GoalIcon size={14} />
              <ThemedText style={styles.goalText}>{signed(match.goalsEarned)}</ThemedText>
            </View>
          ) : null}
          <ThemedText
            style={[
              styles.points,
              { color: points === null || points === 0 ? Colors.textSecondary : points < 0 ? Colors.negative : Colors.positive },
            ]}>
            {uppercase(pointsLabel)}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
  right: {
    textAlign: 'right',
  },
  rewards: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  goal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  goalText: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    lineHeight: 18,
    color: Colors.gold,
  },
  points: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 0.5,
  },
});
