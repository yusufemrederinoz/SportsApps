import { WELCOME_GOALS } from '@sportapps/protocol';
import { useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useAuth } from '@/auth/auth-provider';
import { EntryGate } from '@/auth/entry-gate';
import { ActionButton } from '@/components/action-button';
import { GoalIcon } from '@/components/goal-icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MinimumTouchSize, Motion, Radius, Spacing } from '@/constants/theme';
import { GAMES, GAME_LABELS } from '@/features/games';
import { useUppercase } from '@/i18n/uppercase';

const SAMPLE_LEVEL = 3;
const SAMPLE_POINTS = 25;
const BALL_SIZE = 104;

function OnboardingScreen() {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const { finishOnboarding } = useAuth();
  const scroll = useRef<ScrollView>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [index, setIndex] = useState(0);

  const slides: { title: string; body: string; art: ReactNode }[] = [
    {
      title: t('onboarding.gamesTitle', { games: GAMES.length }),
      body: t('onboarding.gamesBody', { games: GAMES.length }),
      art: (
        <View style={styles.games}>
          {GAMES.map((game, position) => (
            <View key={game} style={[styles.game, position === 0 && styles.gameFirst]}>
              <ThemedText style={[styles.gameText, position === 0 && styles.gameTextFirst]}>{uppercase(t(GAME_LABELS[game]))}</ThemedText>
            </View>
          ))}
        </View>
      ),
    },
    {
      title: t('onboarding.pointsTitle'),
      body: t('onboarding.pointsBody'),
      art: (
        <View style={styles.points}>
          <View style={styles.level}>
            <ThemedText style={styles.levelText}>{uppercase(t('progress.levelShort', { level: SAMPLE_LEVEL }))}</ThemedText>
          </View>
          <ThemedText style={styles.pointsText}>{uppercase(t('reward.points', { value: `+${SAMPLE_POINTS}` }))}</ThemedText>
        </View>
      ),
    },
    {
      title: t('onboarding.goalsTitle'),
      body: t('onboarding.goalsBody', { goals: WELCOME_GOALS }),
      art: (
        <View style={styles.goals}>
          <GoalIcon size={BALL_SIZE} />
          <ThemedText style={styles.goalsText}>{`+${WELCOME_GOALS}`}</ThemedText>
        </View>
      ),
    },
  ];
  const last = index === slides.length - 1;

  const advance = () => {
    if (last) {
      void finishOnboarding();
    } else {
      scroll.current?.scrollTo({ x: (index + 1) * pageWidth, animated: true });
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => void finishOnboarding()} style={styles.skip} hitSlop={Spacing.two}>
          <ThemedText type="label" themeColor="textSecondary">
            {uppercase(t('onboarding.skip'))}
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.pager} onLayout={(event) => setPageWidth(event.nativeEvent.layout.width)}>
        {pageWidth > 0 ? (
          <ScrollView
            ref={scroll}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(event) => {
              const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
              setIndex((current) => (current === next ? current : Math.max(0, Math.min(slides.length - 1, next))));
            }}>
            {slides.map((slide, position) => (
              <View key={slide.title} style={[styles.slide, { width: pageWidth }]}>
                <View style={styles.art}>{slide.art}</View>
                <ThemedText style={styles.number}>{`0${position + 1}`}</ThemedText>
                <ThemedText type="title" accessibilityRole="header">
                  {uppercase(slide.title)}
                </ThemedText>
                <ThemedText themeColor="textSecondary">{slide.body}</ThemedText>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <Animated.View entering={FadeIn.duration(Motion.slow)} style={styles.footer}>
        <View style={styles.dots} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: slides.length, now: index + 1 }}>
          {slides.map((slide, position) => (
            <View key={slide.title} style={[styles.dot, position === index && styles.dotActive]} />
          ))}
        </View>
        <ActionButton label={t(last ? 'onboarding.start' : 'onboarding.next')} onPress={advance} />
      </Animated.View>
    </Screen>
  );
}

export default function OnboardingRoute() {
  return (
    <EntryGate allow="onboarding">
      <OnboardingScreen />
    </EntryGate>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  topBar: {
    alignItems: 'flex-end',
  },
  skip: {
    minHeight: MinimumTouchSize,
    justifyContent: 'center',
  },
  pager: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  art: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  games: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  game: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1.5,
    borderColor: Colors.stroke,
    backgroundColor: Colors.panel,
  },
  gameFirst: {
    borderColor: Colors.volt,
    backgroundColor: Colors.volt,
  },
  gameText: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    lineHeight: 18,
    letterSpacing: 1,
    color: Colors.textSecondary,
  },
  gameTextFirst: {
    color: Colors.onAccent,
  },
  points: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  level: {
    minWidth: 132,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: Radius.large,
    backgroundColor: Colors.volt,
  },
  levelText: {
    fontFamily: Fonts.display,
    fontSize: 56,
    lineHeight: 60,
    color: Colors.onAccent,
  },
  pointsText: {
    fontFamily: Fonts.display,
    fontSize: 34,
    lineHeight: 36,
    color: Colors.positive,
  },
  goals: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  goalsText: {
    fontFamily: Fonts.display,
    fontSize: 56,
    lineHeight: 60,
    color: Colors.gold,
    textShadowColor: Colors.gold,
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
  number: {
    fontFamily: Fonts.display,
    fontSize: 30,
    lineHeight: 32,
    color: Colors.volt,
  },
  footer: {
    gap: Spacing.three,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.stroke,
  },
  dotActive: {
    width: 28,
    backgroundColor: Colors.volt,
  },
});
