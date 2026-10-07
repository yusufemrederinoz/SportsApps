import type { GameId, GameStanding, GoalEntry, GoalReason, MatchSummary, PlayerProgress } from '@sportapps/protocol';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { api } from '@/api';
import { EntryGate } from '@/auth/entry-gate';
import { ActionButton } from '@/components/action-button';
import { GoalIcon } from '@/components/goal-icon';
import { MetalPlate } from '@/components/metal-plate';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { AccentFinishes, Colors, Fonts, MinimumTouchSize, Motion, Radius, Spacing } from '@/constants/theme';
import { MatchRow } from '@/features/account/match-row';
import { GAMES, GAME_LABELS } from '@/features/games';
import { signed } from '@/features/match/match-reward';
import { levelProgress } from '@/features/progress/progress-chip';
import { useProgress } from '@/features/progress/use-progress';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

const PAGE_SIZE = 20;
const VISIBLE_ENTRIES = 12;

const REASON_KEYS = {
  welcome: 'history.reasonWelcome',
  daily: 'history.reasonDaily',
  win: 'history.reasonWin',
  purchase: 'history.reasonPurchase',
  ad: 'history.reasonAd',
} as const satisfies Record<GoalReason, string>;

interface MatchPage {
  game: GameId | null;
  matches: MatchSummary[];
  more: boolean;
}

function percent(part: number, whole: number, language: string): string {
  return whole === 0 ? '–' : new Intl.NumberFormat(language, { style: 'percent' }).format(part / whole);
}

function Summary({ progress }: { progress: PlayerProgress }) {
  const { t, i18n } = useTranslation();
  const uppercase = useUppercase();
  const { level, total, goals } = progress;
  const fill = levelProgress(progress);

  return (
    <MetalPlate finish={AccentFinishes.volt} cut="right" cutSize={24} radius={16} style={styles.summary}>
      <View style={styles.summaryTop}>
        <View>
          <ThemedText type="label" style={styles.summaryInk}>
            {uppercase(t('history.totalPoints'))}
          </ThemedText>
          <ThemedText style={styles.summaryPoints}>{total.toLocaleString(i18n.language)}</ThemedText>
        </View>
        <View style={styles.summaryLevel}>
          <ThemedText style={styles.summaryLevelText}>{uppercase(t('progress.level', { level: level.level }))}</ThemedText>
        </View>
      </View>
      <View style={styles.levelBar} accessible accessibilityLabel={t('progress.toNext', { points: level.next - total })}>
        <View style={[styles.levelFill, { width: `${fill * 100}%` }]} />
      </View>
      <View style={styles.summaryBottom}>
        <ThemedText type="label" style={styles.summaryInk}>
          {uppercase(t('progress.toNext', { points: (level.next - total).toLocaleString(i18n.language) }))}
        </ThemedText>
        <View style={styles.summaryGoals} accessible accessibilityLabel={t('progress.goals', { goals })}>
          <GoalIcon size={22} />
          <ThemedText style={styles.summaryGoalsText}>{goals.toLocaleString(i18n.language)}</ThemedText>
        </View>
      </View>
    </MetalPlate>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  const uppercase = useUppercase();
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}`}>
      <ThemedText style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </ThemedText>
      <ThemedText type="label" themeColor="textSecondary" numberOfLines={1} adjustsFontSizeToFit>
        {uppercase(label)}
      </ThemedText>
    </View>
  );
}

function StandingRow({
  standing,
  selected,
  onPress,
}: {
  standing: GameStanding;
  selected: boolean;
  onPress: () => void;
}) {
  const { t, i18n } = useTranslation();
  const uppercase = useUppercase();
  const record = t('history.record', { wins: standing.wins, draws: standing.draws, losses: standing.losses });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${t(GAME_LABELS[standing.game])}, ${t('progress.points', { points: standing.points })}, ${record}`}
      onPress={onPress}
      style={({ pressed }) => [styles.standing, selected && styles.standingSelected, pressed && styles.standingPressed]}>
      <View style={styles.standingTexts}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {t(GAME_LABELS[standing.game])}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {`${record} · ${percent(standing.wins, standing.played, i18n.language)}`}
        </ThemedText>
      </View>
      <View style={styles.standingScore}>
        <ThemedText style={styles.standingPoints}>{uppercase(t('progress.points', { points: standing.points }))}</ThemedText>
        <ThemedText type="label" themeColor="textSecondary">
          {uppercase(t('history.bestPoints', { points: standing.bestPoints }))}
        </ThemedText>
      </View>
    </Pressable>
  );
}

function GoalRow({ entry }: { entry: GoalEntry }) {
  const { t, i18n } = useTranslation();
  const when = new Date(entry.createdAt).toLocaleString(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.goalRow} accessible accessibilityLabel={`${t(REASON_KEYS[entry.reason])}, ${signed(entry.amount)}, ${when}`}>
      <GoalIcon size={20} />
      <View style={styles.standingTexts}>
        <ThemedText type="smallBold">{t(REASON_KEYS[entry.reason])}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {when}
        </ThemedText>
      </View>
      <ThemedText style={[styles.goalAmount, { color: entry.amount < 0 ? Colors.negative : Colors.gold }]}>
        {signed(entry.amount)}
      </ThemedText>
      <ThemedText type="label" themeColor="textSecondary" style={styles.goalBalance}>
        {entry.balance}
      </ThemedText>
    </View>
  );
}

function HistoryScreen() {
  const { t, i18n } = useTranslation();
  const uppercase = useUppercase();
  const router = useRouter();
  const { token, progress } = useProgress();
  const [game, setGame] = useState<GameId | null>(null);
  const [page, setPage] = useState<MatchPage | null>(null);
  const [entries, setEntries] = useState<GoalEntry[]>([]);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        return undefined;
      }
      let cancelled = false;
      Promise.all([api.matches(token, { game: game ?? undefined, limit: PAGE_SIZE }), api.wallet(token)])
        .then(([history, wallet]) => {
          if (!cancelled) {
            setPage({ game, matches: history.matches, more: history.more });
            setEntries(wallet.entries.slice(0, VISIBLE_ENTRIES));
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
    }, [token, game]),
  );

  const loadMore = async () => {
    const last = page?.matches.at(-1);
    if (!token || !page || !last || loading) {
      return;
    }
    setLoading(true);
    try {
      const next = await api.matches(token, { game: page.game ?? undefined, before: last.finishedAt, limit: PAGE_SIZE });
      setPage((current) =>
        current && current.game === page.game
          ? { ...current, matches: [...current.matches, ...next.matches], more: next.more }
          : current,
      );
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const choose = (option: GameId | null) => {
    haptics.select();
    setGame((current) => (current === option ? null : option));
  };

  const record = progress?.record;
  const matches = page && page.game === game ? page.matches : null;

  return (
    <Screen contentStyle={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back} hitSlop={Spacing.two}>
          <ThemedText type="label" themeColor="textSecondary">
            {`‹ ${uppercase(t('account.back'))}`}
          </ThemedText>
        </Pressable>
        <ThemedText type="title" accessibilityRole="header">
          {uppercase(t('history.title'))}
        </ThemedText>

        {progress ? (
          <Animated.View entering={FadeInDown.duration(Motion.slow)} style={styles.section}>
            <Summary progress={progress} />
            {record ? (
              <View style={styles.tiles}>
                <StatTile label={t('history.played')} value={String(record.played)} />
                <StatTile label={t('history.wins')} value={String(record.wins)} />
                <StatTile label={t('history.winRate')} value={percent(record.wins, record.played, i18n.language)} />
                <StatTile label={t('history.bestStreak')} value={String(record.bestStreak)} />
              </View>
            ) : null}
          </Animated.View>
        ) : null}

        {progress ? (
          <Animated.View entering={FadeInDown.duration(Motion.slow).delay(80)} style={styles.section}>
            <ThemedText type="label" themeColor="textSecondary">
              {uppercase(t('history.games'))}
            </ThemedText>
            {progress.games.map((standing) => (
              <StandingRow
                key={standing.game}
                standing={standing}
                selected={standing.game === game}
                onPress={() => choose(standing.game)}
              />
            ))}
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.duration(Motion.slow).delay(160)} style={styles.section}>
          <ThemedText type="label" themeColor="textSecondary">
            {uppercase(t('history.matches'))}
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} accessibilityRole="radiogroup">
            {[null, ...GAMES].map((option) => {
              const selected = option === game;
              return (
                <Pressable
                  key={option ?? 'all'}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => choose(option)}
                  style={[styles.filter, selected && styles.filterSelected]}>
                  <ThemedText style={[styles.filterLabel, { color: selected ? Colors.onAccent : Colors.textSecondary }]}>
                    {uppercase(option ? t(GAME_LABELS[option]) : t('history.allGames'))}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
          {failed ? <ThemedText themeColor="negative">{t('history.offline')}</ThemedText> : null}
          {matches?.length === 0 ? <ThemedText themeColor="textSecondary">{t('history.empty')}</ThemedText> : null}
          {matches?.map((match) => <MatchRow key={match.id} match={match} />)}
          {page?.more && page.game === game ? (
            <ActionButton label={t('history.more')} onPress={() => void loadMore()} variant="secondary" />
          ) : null}
        </Animated.View>

        {entries.length > 0 ? (
          <Animated.View entering={FadeInDown.duration(Motion.slow).delay(240)} style={styles.section}>
            <ThemedText type="label" themeColor="textSecondary">
              {uppercase(t('history.goalsTitle'))}
            </ThemedText>
            {entries.map((entry, index) => (
              <GoalRow key={`${entry.createdAt}-${index}`} entry={entry} />
            ))}
          </Animated.View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

export default function HistoryRoute() {
  return (
    <EntryGate allow="app">
      <HistoryScreen />
    </EntryGate>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 0,
  },
  content: {
    gap: Spacing.four,
    paddingBottom: Spacing.five,
  },
  back: {
    minHeight: MinimumTouchSize,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  section: {
    gap: Spacing.two,
  },
  summary: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  summaryInk: {
    color: AccentFinishes.volt.ink,
  },
  summaryPoints: {
    fontFamily: Fonts.display,
    fontSize: 56,
    lineHeight: 58,
    color: AccentFinishes.volt.ink,
  },
  summaryLevel: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.small,
    backgroundColor: Colors.ink,
  },
  summaryLevelText: {
    fontFamily: Fonts.display,
    fontSize: 24,
    lineHeight: 26,
    color: Colors.volt,
  },
  levelBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(5, 7, 10, 0.25)',
    overflow: 'hidden',
  },
  levelFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.ink,
  },
  summaryBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  summaryGoals: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    backgroundColor: Colors.ink,
  },
  summaryGoalsText: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    lineHeight: 24,
    color: Colors.gold,
  },
  tiles: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.stroke,
    backgroundColor: Colors.panel,
  },
  tileValue: {
    fontFamily: Fonts.display,
    fontSize: 30,
    lineHeight: 32,
    color: Colors.text,
  },
  standing: {
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
  standingSelected: {
    borderColor: Colors.volt,
  },
  standingPressed: {
    backgroundColor: Colors.panelRaised,
  },
  standingTexts: {
    flex: 1,
    gap: Spacing.half,
  },
  standingScore: {
    alignItems: 'flex-end',
  },
  standingPoints: {
    fontFamily: Fonts.display,
    fontSize: 24,
    lineHeight: 26,
    color: Colors.volt,
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
  goalRow: {
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
  goalAmount: {
    fontFamily: Fonts.display,
    fontSize: 24,
    lineHeight: 26,
  },
  goalBalance: {
    minWidth: 32,
    textAlign: 'right',
  },
});
