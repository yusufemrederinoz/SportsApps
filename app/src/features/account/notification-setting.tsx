import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';

import { api } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { notificationsMuted, setNotificationsMuted } from '@/notifications/preference';
import { registerForPush, unregisterFromPush } from '@/notifications/push';
import { useUppercase } from '@/i18n/uppercase';

export function NotificationSetting({ token }: { token: string }) {
  const { t, i18n } = useTranslation();
  const uppercase = useUppercase();
  const [muted, setMuted] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void notificationsMuted().then((value) => {
      if (active) {
        setMuted(value);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const change = (enabled: boolean) => {
    setMuted(!enabled);
    void setNotificationsMuted(!enabled).catch(() => undefined);
    void (enabled ? registerForPush(api, token, i18n.language) : unregisterFromPush(api, token)).catch(() => undefined);
  };

  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <ThemedText type="label" themeColor="textSecondary">
          {uppercase(t('account.notifications'))}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('account.notificationsHint')}
        </ThemedText>
      </View>
      <Switch
        accessibilityLabel={t('account.notifications')}
        disabled={muted === null}
        value={muted === false}
        onValueChange={change}
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
