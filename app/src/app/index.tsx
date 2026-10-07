import type { GameId } from '@sportapps/protocol';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInLeft } from 'react-native-reanimated';

import { useAuth } from '@/auth/auth-provider';
import { EntryGate } from '@/auth/entry-gate';
import { ModeCard } from '@/components/mode-card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { AccentFinishes, Colors, Finishes, Fonts, MinimumTouchSize, Motion, Radius, Spacing } from '@/constants/theme';
import type { Difficulty } from '@/data/types';
import { GAMES, GAME_ACCENTS, GAME_LABELS, GAME_SUBTITLES } from '@/features/games';
import { DIFFICULTIES, DIFFICULTY_LABELS } from '@/features/match/difficulty';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

function HomeScreen() {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const router = useRouter();
  const { state: auth } = useAuth();
  const [difficulty, setDifficulty] = useState<Difficulty>(1);
  const [game, setGame] = useState<GameId>('grid');
  const gameScroller = useRef<ScrollView>(null);
  const gameScrollerWidth = useRef(0);
  const chipFrames = useRef<Partial<Record<GameId, { x: number; width: number }>>>({});
  const accountLabel = auth.status === 'signed-in' ? auth.account.username : t('account.offline');
  const accent = t(GAME_ACCENTS[game]);
  const startBot = () => router.push({ pathname: '/match', params: { mode: 'bot', difficulty: String(difficulty) } });
  const startOnline = () =>
    router.push({ pathname: '/match', params: { mode: 'online', entry: 'queue', difficulty: String(difficulty), game } });
  const openFriend = () => router.push({ pathname: '/friend', params: { difficulty: String(difficulty), game } });

  return (
    <Screen contentStyle={styles.screen}>
  const selectGame = (option: GameId) => {
    haptics.select();
    setGame(option);
    const frame = chipFrames.current[option];
    if (frame) {
      const x = frame.x + frame.width / 2 - gameScrollerWidth.current / 2;
      gameScroller.current?.scrollTo({ x: Math.max(0, x), animated: true });
    }
  };
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(Motion.slow)} style={styles.accountRow}>
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

        <View style={styles.hero} accessible accessibilityRole="header" accessibilityLabel={`${t('home.titleLead')} ${accent}`}>
          <Animated.View entering={FadeInLeft.duration(Motion.slow)}>
            <ThemedText type="display">{uppercase(t('home.titleLead'))}</ThemedText>
          </Animated.View>
          <Animated.View entering={FadeInLeft.duration(Motion.slow).delay(110)} style={styles.accentRow}>
            <ThemedText key={game} type="display" style={styles.accent}>
              {uppercase(accent)}
            </ThemedText>
            <View style={styles.slash} />
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(Motion.slow).delay(220)}>
            <ThemedText themeColor="textSecondary">{t(GAME_SUBTITLES[game])}</ThemedText>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.duration(Motion.slow).delay(260)} style={styles.section}>
          <ThemedText type="label" themeColor="textSecondary">
            {uppercase(t('home.game'))}
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.gameScroller}
            ref={gameScroller}
            contentContainerStyle={styles.gameRow}
            accessibilityRole="radiogroup">
            onLayout={(event) => {
              gameScrollerWidth.current = event.nativeEvent.layout.width;
            }}
            {GAMES.map((option) => {
              const selected = option === game;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => selectGame(option)}
                  onLayout={(event) => {
                    const { x, width } = event.nativeEvent.layout;
                    chipFrames.current[option] = { x, width };
                  }}
                  style={[styles.difficultyOption, styles.gameOption, selected && styles.difficultySelected]}>
                  <ThemedText style={[styles.difficultyLabel, { color: selected ? Colors.onAccent : Colors.textSecondary }]}>
                    {uppercase(t(GAME_LABELS[option]))}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(Motion.slow).delay(300)} style={styles.section}>
          <ThemedText type="label" themeColor="textSecondary">
            {uppercase(t('home.difficulty'))}
          </ThemedText>
          <View style={styles.difficultyRow} accessibilityRole="radiogroup">
            {DIFFICULTIES.map((option) => {
              const selected = option === difficulty;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    haptics.select();
                    setDifficulty(option);
                  }}
                  style={[styles.difficultyOption, selected && styles.difficultySelected]}>
                  <ThemedText style={[styles.difficultyLabel, { color: selected ? Colors.onAccent : Colors.textSecondary }]}>
                    {uppercase(t(DIFFICULTY_LABELS[option]))}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(Motion.slow).delay(380)} style={styles.section}>
          <ModeCard
            title={t('home.modeOnlineTitle')}
            hint={t('home.modeOnlineHint')}
            finish={AccentFinishes.volt}
            onPress={startOnline}
          />
          <ModeCard
            title={t('home.modeFriendTitle')}
            hint={t('home.modeFriendHint')}
            finish={AccentFinishes.steel}
            onPress={openFriend}
          />
          {game === 'grid' ? (
            <ModeCard title={t('home.modeBotTitle')} hint={t('home.modeBotHint')} finish={Finishes.x} onPress={startBot} />
          ) : null}
        </Animated.View>
      </ScrollView>
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
    paddingHorizontal: Spacing.four,
    paddingBottom: 0,
  },
  content: {
    flexGrow: 1,
    gap: Spacing.four,
    paddingBottom: Spacing.four,
  },
  accountRow: {
    alignItems: 'flex-end',
  },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: MinimumTouchSize,
    maxWidth: 240,
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
  hero: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.one,
  },
  accentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  accent: {
    color: Colors.volt,
    textShadowColor: Colors.volt,
    textShadowRadius: 22,
    textShadowOffset: { width: 0, height: 0 },
  },
  slash: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.volt,
    transform: [{ rotate: '-4deg' }],
  },
  section: {
    gap: Spacing.three,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  difficultyOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MinimumTouchSize,
    borderRadius: Radius.medium,
    borderWidth: 1.5,
    borderColor: Colors.stroke,
    backgroundColor: Colors.panel,
  },
  difficultySelected: {
    borderColor: Colors.volt,
    backgroundColor: Colors.volt,
    shadowColor: Colors.volt,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  gameScroller: {
    flexGrow: 0,
  },
  gameRow: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  gameOption: {
    flex: 0,
    paddingHorizontal: Spacing.four,
  },
  difficultyLabel: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    lineHeight: 20,
    letterSpacing: 1,
  },
});
