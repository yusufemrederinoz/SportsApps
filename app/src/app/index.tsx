import { DEFAULT_RULES } from '@sportapps/game-core';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const { t } = useTranslation();
  const rules = [
    t('home.ruleTurn', { seconds: DEFAULT_RULES.turnSeconds }),
    t('home.ruleLine'),
    t('home.ruleCells'),
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <ThemedText type="title" style={styles.centered}>
            {t('home.title')}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centered}>
            {t('home.subtitle')}
          </ThemedText>
        </ThemedView>

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
    gap: Spacing.three,
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
  rulesCard: {
    alignSelf: 'stretch',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
});
