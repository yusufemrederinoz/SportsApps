import { DEFAULT_RULES } from '@sportapps/game-core';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInLeft } from 'react-native-reanimated';

import { ModeCard } from '@/components/mode-card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Finishes, Fonts, MinimumTouchSize, Motion, Radius, Spacing } from '@/constants/theme';
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
      <View style={styles.hero} accessible accessibilityRole="header" accessibilityLabel={`${t('home.titleLead')} ${t('home.titleAccent')}`}>
        <Animated.View entering={FadeInLeft.duration(Motion.slow)}>
          <ThemedText type="display">{uppercase(t('home.titleLead'))}</ThemedText>
        </Animated.View>
        <Animated.View entering={FadeInLeft.duration(Motion.slow).delay(110)} style={styles.accentRow}>
          <ThemedText type="display" style={styles.accent}>
            {uppercase(t('home.titleAccent'))}
          </ThemedText>
          <View style={styles.slash} />
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(Motion.slow).delay(220)}>
          <ThemedText themeColor="textSecondary">{t('home.subtitle')}</ThemedText>
        </Animated.View>
      </View>

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
        <ModeCard title={t('home.modeBotTitle')} hint={t('home.modeBotHint')} finish={Finishes.x} onPress={() => start('bot')} />
        <ModeCard
          title={t('home.modeLocalTitle')}
          hint={t('home.modeLocalHint')}
          finish={Finishes.o}
          onPress={() => start('local')}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(Motion.slow).delay(460)} style={styles.rules}>
        <ThemedText type="label" themeColor="volt">
          {uppercase(t('home.rulesTitle'))}
        </ThemedText>
        {rules.map((rule, index) => (
          <View key={rule} style={styles.rule}>
            <ThemedText style={styles.ruleNumber}>{`0${index + 1}`}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.ruleText}>
              {rule}
            </ThemedText>
          </View>
        ))}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
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
  difficultyLabel: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    lineHeight: 20,
    letterSpacing: 1,
  },
  rules: {
    gap: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: Colors.stroke,
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  ruleNumber: {
    fontFamily: Fonts.display,
    fontSize: 22,
    lineHeight: 24,
    color: Colors.volt,
    width: 28,
  },
  ruleText: {
    flex: 1,
  },
});
