import type { GameId } from '@sportapps/protocol';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useAuth } from '@/auth/auth-provider';
import { EntryGate } from '@/auth/entry-gate';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, MinimumTouchSize, Motion, Radius, Spacing } from '@/constants/theme';
import type { Difficulty } from '@/data/types';
import { GAMES, GAME_LABELS } from '@/features/games';
import { GameCarousel } from '@/features/home/game-carousel';
import { PlayButton } from '@/features/home/play-button';
import { PlaySheet } from '@/features/home/play-sheet';
import { DailyRewardDialog } from '@/features/progress/daily-reward-dialog';
import { HomeTiles } from '@/features/progress/home-tiles';
import { ProgressChip } from '@/features/progress/progress-chip';
import { useProgress } from '@/features/progress/use-progress';
import { haptics } from '@/feedback/haptics';
import { usePush } from '@/notifications/use-push';

function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { state: auth } = useAuth();
  const { progress, reward, dismissReward } = useProgress({ claimDaily: true });
  usePush(progress !== null && reward === null);
  const [difficulty, setDifficulty] = useState<Difficulty>(1);
  const [index, setIndex] = useState(0);
  const [choosing, setChoosing] = useState(false);
  const game = GAMES[index];
  const accountLabel = auth.status === 'signed-in' ? auth.account.username : t('account.offline');
  const pointsFor = (option: GameId) => progress?.games.find((standing) => standing.game === option)?.points ?? null;
  const start = (open: () => void) => {
    setChoosing(false);
    open();
  };
  const startBot = () =>
    start(() =>
      game === 'grid'
        ? router.push({ pathname: '/match', params: { mode: 'bot', difficulty: String(difficulty) } })
        : router.push({ pathname: '/match', params: { mode: 'online', entry: 'bot', difficulty: String(difficulty), game } }),
    );
  const startOnline = () =>
    start(() => router.push({ pathname: '/match', params: { mode: 'online', entry: 'queue', difficulty: String(difficulty), game } }));
  const openFriend = () => start(() => router.push({ pathname: '/friend', params: { difficulty: String(difficulty), game } }));

  return (
    <Screen
      contentStyle={styles.screen}
      overlay={
        choosing ? (
          <PlaySheet
            game={game}
            difficulty={difficulty}
            onDifficulty={setDifficulty}
            onOnline={startOnline}
            onFriend={openFriend}
            onBot={startBot}
            onClose={() => setChoosing(false)}
          />
        ) : null
      }>
      <Animated.View entering={FadeInDown.duration(Motion.slow)} style={styles.accountRow}>
        {progress ? (
          <ProgressChip progress={progress} onPress={() => router.push('/history')} onGoalsPress={() => router.push('/store')} />
        ) : (
          <View />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('home.account')}: ${accountLabel}`}
          onPress={() => {
            haptics.select();
            router.push('/account');
          }}
          style={({ pressed }) => [styles.accountChip, pressed && styles.accountChipPressed]}>
          <View style={[styles.accountDot, auth.status === 'signed-in' ? styles.accountOnline : styles.accountOffline]} />
          <ThemedText type="label" numberOfLines={1} style={styles.accountName}>
            {accountLabel}
          </ThemedText>
          <ThemedText type="label" themeColor="volt">
            ›
          </ThemedText>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(Motion.slow).delay(80)}>
        <HomeTiles onPuzzle={() => router.push('/puzzle')} onLeaderboard={() => router.push('/leaderboard')} />
      </Animated.View>

      <Animated.View entering={FadeIn.duration(Motion.cinematic).delay(160)} style={styles.carousel}>
        <GameCarousel index={index} onIndexChange={setIndex} pointsFor={pointsFor} />
      </Animated.View>

      <Animated.View entering={FadeInUp.duration(Motion.slow).delay(240)}>
        <PlayButton label={t('home.play')} hint={t(GAME_LABELS[game])} onPress={() => setChoosing(true)} />
      </Animated.View>

      {reward ? <DailyRewardDialog reward={reward} onClose={dismissReward} /> : null}
    </Screen>
  );
}

export default function HomeRoute() {
  return (
    <EntryGate allow="app">
      <HomeScreen />
    </EntryGate>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: MinimumTouchSize,
    flexShrink: 1,
    maxWidth: 200,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1.5,
    borderColor: Colors.strokeBright,
    backgroundColor: Colors.panel,
  },
  accountChipPressed: {
    borderColor: Colors.volt,
    backgroundColor: Colors.panelRaised,
  },
  accountDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  accountOnline: {
    backgroundColor: Colors.positive,
  },
  accountOffline: {
    backgroundColor: Colors.strokeBright,
  },
  accountName: {
    flexShrink: 1,
  },
  carousel: {
    flex: 1,
    marginHorizontal: -Spacing.four,
  },
});
