import { DEFAULT_RULES } from '@sportapps/game-core';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { Difficulty } from '@/data/types';
import { DIFFICULTIES, DIFFICULTY_LABELS } from '@/features/match/difficulty';
import type { MatchMode } from '@/features/match/use-match';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
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
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.heroSection}>
          <ThemedText type="title" style={styles.centered}>
            {t('home.title')}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centered}>
            {t('home.subtitle')}
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold">{t('home.difficulty')}</ThemedText>
          <View style={styles.difficultyRow}>
            {DIFFICULTIES.map((option) => {
              const selected = option === difficulty;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setDifficulty(option)}
                  style={[
                    styles.difficultyOption,
                    { backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement },
                  ]}>
                  <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'}>
                    {t(DIFFICULTY_LABELS[option])}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <ActionButton label={t('home.playBot')} onPress={() => start('bot')} />
          <ActionButton label={t('home.playLocal')} onPress={() => start('local')} variant="secondary" />
        </View>

        <ThemedView type="backgroundElement" style={styles.rulesCard}>
          <ThemedText type="smallBold">{t('home.rulesTitle')}</ThemedText>
          {rules.map((rule) => (
            <ThemedText key={rule} type="small" themeColor="textSecondary">
              {rule}
            </ThemedText>
          ))}
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    alignItems: 'center',
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
  },
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
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
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rulesCard: {
    alignSelf: 'stretch',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
});
