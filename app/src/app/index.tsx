import { DEFAULT_RULES } from '@sportapps/game-core';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ActionButton } from '@/components/action-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, MinimumTouchSize, Motion, Radius, Spacing } from '@/constants/theme';
import type { Difficulty } from '@/data/types';
import { DIFFICULTIES, DIFFICULTY_LABELS } from '@/features/match/difficulty';
import type { MatchMode } from '@/features/match/use-match';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

export default function HomeScreen() {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty>(1);
  const rules = [
    t('home.ruleTurn', { seconds: DEFAULT_RULES.turnSeconds }),
    t('home.ruleLine'),
    t('home.ruleCells'),
  ];
  const start = (mode: MatchMode) =>
    router.push({ pathname: '/match', params: { mode, difficulty: String(difficulty) } });

  return (
    <Screen contentStyle={styles.content}>
      <Animated.View entering={FadeInDown.duration(Motion.slow)} style={styles.hero}>
        <ThemedText type="display" style={styles.title} accessibilityRole="header">
          {uppercase(t('home.title'))}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.centered}>
          {t('home.subtitle')}
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(Motion.slow).delay(80)} style={styles.section}>
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
                <ThemedText type="label" themeColor={selected ? 'pitch' : 'textSecondary'}>
                  {uppercase(t(DIFFICULTY_LABELS[option]))}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        <ActionButton label={t('home.playBot')} onPress={() => start('bot')} />
        <ActionButton label={t('home.playLocal')} onPress={() => start('local')} variant="secondary" />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(Motion.slow).delay(160)} style={styles.rulesCard}>
        <ThemedText type="label" themeColor="floodlight">
          {uppercase(t('home.rulesTitle'))}
        </ThemedText>
        {rules.map((rule) => (
          <ThemedText key={rule} type="small" themeColor="textSecondary">
            {rule}
          </ThemedText>
        ))}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
    textShadowColor: Colors.floodlight,
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
  centered: {
    textAlign: 'center',
  },
  section: {
    alignSelf: 'stretch',
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
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  difficultySelected: {
    borderColor: Colors.pitch,
    backgroundColor: Colors.surfaceRaised,
  },
  rulesCard: {
    alignSelf: 'stretch',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
});
