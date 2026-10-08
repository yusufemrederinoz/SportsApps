import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export function LegalNotice() {
  const { t } = useTranslation();

  return (
    <ThemedText type="small" themeColor="textSecondary" style={styles.notice}>
      {t('legal.notice')}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  notice: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.8,
  },
});
