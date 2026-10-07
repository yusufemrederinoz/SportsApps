import type { GameId, LeaderboardEntry, LeaderboardPeriod, LeaderboardResponse } from '@sportapps/protocol';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { api } from '@/api';
import { useAuth } from '@/auth/auth-provider';
import { EntryGate } from '@/auth/entry-gate';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MinimumTouchSize, Motion, Radius, Spacing } from '@/constants/theme';
import { GAMES, GAME_LABELS } from '@/features/games';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

const PERIODS: readonly LeaderboardPeriod[] = ['week', 'all'];
const MEDALS = ['#F3C653', '#C9D3DF', '#D08A4E'] as const;

function Row({ entry, pinned = false }: { entry: LeaderboardEntry; pinned?: boolean }) {
  const { t, i18n } = useTranslation();
  const uppercase = useUppercase();
  const medal = MEDALS[entry.rank - 1] ?? null;

  return (
    <View
      style={[styles.row, entry.you && styles.rowYou, pinned && styles.rowPinned]}
      accessible
      accessibilityLabel={`${entry.rank}. ${entry.username}, ${t('leaderboard.points', { points: entry.points })}`}>
      <View style={[styles.rank, medal ? { backgroundColor: medal } : null]}>
        <ThemedText style={[styles.rankText, medal ? styles.rankTextMedal : null]}>{entry.rank}</ThemedText>
      </View>
      <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
        {entry.username}
      </ThemedText>
      <View style={styles.level}>
        <ThemedText style={styles.levelText}>{uppercase(t('leaderboard.level', { level: entry.level }))}</ThemedText>
      </View>
      <ThemedText style={styles.points}>{entry.points.toLocaleString(i18n.language)}</ThemedText>
    </View>
  );
}

function LeaderboardScreen() {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const router = useRouter();
  const { state } = useAuth();
  const token = state.status === 'signed-in' ? state.token : null;
  const [period, setPeriod] = useState<LeaderboardPeriod>('week');
  const [game, setGame] = useState<GameId | null>(null);
  const [board, setBoard] = useState<LeaderboardResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        return undefined;
      }
      let cancelled = false;
      api
        .leaderboard(token, period, game)
        .then((response) => {
          if (!cancelled) {
            setBoard(response);
            setFailed(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setFailed(true);
          }
        });
      return () => {
        cancelled = true;
      };
    }, [token, period, game]),
  );

  const current = board && board.period === period && board.game === game ? board : null;
  const youShown = current?.entries.some((entry) => entry.you) ?? false;

  return (
    <Screen contentStyle={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back} hitSlop={Spacing.two}>
          <ThemedText type="label" themeColor="textSecondary">
            {`‹ ${uppercase(t('account.back'))}`}
          </ThemedText>
        </Pressable>
        <ThemedText type="title" accessibilityRole="header">
          {uppercase(t('leaderboard.title'))}
        </ThemedText>

        <View style={styles.periods} accessibilityRole="radiogroup">
          {PERIODS.map((option) => {
            const selected = option === period;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => {
                  haptics.select();
                  setPeriod(option);
                }}
                style={[styles.period, selected && styles.periodSelected]}>
                <ThemedText style={[styles.periodLabel, { color: selected ? Colors.onAccent : Colors.textSecondary }]}>
                  {uppercase(t(option === 'week' ? 'leaderboard.week' : 'leaderboard.all'))}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} accessibilityRole="radiogroup">
          {[null, ...GAMES].map((option) => {
            const selected = option === game;
            return (
              <Pressable
                key={option ?? 'all'}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => {
                  haptics.select();
                  setGame(option);
                }}
                style={[styles.filter, selected && styles.filterSelected]}>
                <ThemedText style={[styles.filterLabel, { color: selected ? Colors.onAccent : Colors.textSecondary }]}>
                  {uppercase(option ? t(GAME_LABELS[option]) : t('leaderboard.overall'))}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {period === 'week' ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('leaderboard.resets')}
          </ThemedText>
        ) : null}
        {failed ? <ThemedText themeColor="negative">{t('leaderboard.offline')}</ThemedText> : null}

        {current ? (
          <Animated.View key={`${period}-${game ?? 'all'}`} entering={FadeInDown.duration(Motion.base)} style={styles.list}>
            {current.entries.length === 0 ? <ThemedText themeColor="textSecondary">{t('leaderboard.empty')}</ThemedText> : null}
            {current.entries.map((entry) => (
              <Row key={`${entry.rank}-${entry.username}`} entry={entry} />
            ))}
            {current.you && !youShown ? (
              <View style={styles.pinned}>
                <ThemedText type="label" themeColor="textSecondary">
                  {uppercase(t('leaderboard.yourRank'))}
                </ThemedText>
                <Row entry={current.you} pinned />
              </View>
            ) : null}
          </Animated.View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

export default function LeaderboardRoute() {
  return (
    <EntryGate allow="app">
      <LeaderboardScreen />
    </EntryGate>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 0,
  },
  content: {
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  back: {
    minHeight: MinimumTouchSize,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  periods: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  period: {
    flex: 1,
    minHeight: MinimumTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.medium,
    borderWidth: 1.5,
    borderColor: Colors.stroke,
    backgroundColor: Colors.panel,
  },
  periodSelected: {
    borderColor: Colors.volt,
    backgroundColor: Colors.volt,
  },
  periodLabel: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    lineHeight: 20,
    letterSpacing: 1,
  },
  filters: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  filter: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1.5,
    borderColor: Colors.stroke,
    backgroundColor: Colors.panel,
  },
  filterSelected: {
    borderColor: Colors.volt,
    backgroundColor: Colors.volt,
  },
  filterLabel: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    lineHeight: 18,
    letterSpacing: 1,
  },
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: MinimumTouchSize + Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.stroke,
    backgroundColor: Colors.panel,
  },
  rowYou: {
    borderColor: Colors.volt,
    borderWidth: 1.5,
  },
  rowPinned: {
    backgroundColor: Colors.panelRaised,
  },
  rank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.ink,
  },
  rankText: {
    fontFamily: Fonts.display,
    fontSize: 18,
    lineHeight: 20,
    color: Colors.text,
  },
  rankTextMedal: {
    color: Colors.onAccent,
  },
  name: {
    flex: 1,
  },
  level: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.small,
    backgroundColor: Colors.ink,
  },
  levelText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    lineHeight: 16,
    color: Colors.volt,
  },
  points: {
    minWidth: 56,
    textAlign: 'right',
    fontFamily: Fonts.display,
    fontSize: 22,
    lineHeight: 24,
    color: Colors.text,
  },
  pinned: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
