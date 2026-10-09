import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MinimumTouchSize, Spacing } from '@/constants/theme';
import { legalUrl, type LegalPage } from '@/legal/links';

const PAGES: readonly { page: LegalPage; label: 'legal.terms' | 'legal.privacy' }[] = [
  { page: 'terms', label: 'legal.terms' },
  { page: 'privacy', label: 'legal.privacy' },
];

export function LegalLinks({ consent = false }: { consent?: boolean }) {
  const { t, i18n } = useTranslation();

  return (
    <View style={styles.container}>
      {consent ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.consent}>
          {t('legal.consent')}
        </ThemedText>
      ) : null}
      <View style={styles.row}>
        {PAGES.map(({ page, label }) => (
          <Pressable
            key={page}
            accessibilityRole="link"
            hitSlop={Spacing.two}
            onPress={() => void Linking.openURL(legalUrl(page, i18n.language)).catch(() => undefined)}
            style={styles.link}>
            <ThemedText type="small" themeColor="volt" style={styles.label}>
              {t(label)}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  consent: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: Spacing.four,
  },
  link: {
    minHeight: MinimumTouchSize,
    justifyContent: 'center',
  },
  label: {
    textDecorationLine: 'underline',
  },
});
