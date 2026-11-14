import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { setAmbienceMuted, useAmbienceMuted } from '@/feedback/ambience';
import { useUppercase } from '@/i18n/uppercase';

export function AmbienceSetting() {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const muted = useAmbienceMuted();

  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <ThemedText type="label" themeColor="textSecondary">
          {uppercase(t('account.ambience'))}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('account.ambienceHint')}
        </ThemedText>
      </View>
      <Switch
        accessibilityLabel={t('account.ambience')}
        disabled={muted === null}
        value={muted === false}
        onValueChange={(enabled) => void setAmbienceMuted(!enabled).catch(() => undefined)}
        trackColor={{ false: Colors.stroke, true: Colors.volt }}
        thumbColor={Colors.text}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  texts: {
    flex: 1,
    gap: Spacing.half,
  },
});
