import { PASSWORD_RULES, unmetPasswordRules } from '@sportapps/protocol';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';

const RULE_KEYS = {
  length: 'passwordRules.length',
  uppercase: 'passwordRules.uppercase',
  lowercase: 'passwordRules.lowercase',
  digit: 'passwordRules.digit',
} as const;

export function PasswordRules({ password }: { password: string }) {
  const { t } = useTranslation();
  const unmet = unmetPasswordRules(password);

  return (
    <View style={styles.list} accessibilityRole="list">
      {PASSWORD_RULES.map((rule) => {
        const met = !unmet.includes(rule);
        return (
          <View key={rule} style={styles.rule} accessible accessibilityState={{ checked: met }}>
            <View style={[styles.mark, met ? styles.markMet : styles.markUnmet]} />
            <ThemedText type="small" themeColor={met ? 'positive' : 'textSecondary'}>
              {t(RULE_KEYS[rule])}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.one,
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  mark: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  markMet: {
    backgroundColor: Colors.positive,
    borderColor: Colors.positive,
  },
  markUnmet: {
    borderColor: Colors.strokeBright,
  },
});
