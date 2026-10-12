import { useTranslation } from 'react-i18next';
import { ActivityIndicator, BackHandler, Modal, StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { GoalIcon } from '@/components/goal-icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useUppercase } from '@/i18n/uppercase';

import { openStoreListing } from './open-store-listing';
import type { DataSync, SyncStatus } from './use-data-sync';

const BALL_SIZE = 112;
const TEXTS = {
  'update-app': { title: 'update.title', body: 'update.body' },
  downloading: { title: 'update.dataTitle', body: 'update.dataBody' },
  failed: { title: 'update.dataFailedTitle', body: 'update.dataFailedBody' },
} as const satisfies Record<Exclude<SyncStatus, 'current'>, { title: string; body: string }>;

export function UpdateGate({ status, retry, postpone }: DataSync) {
  const { t } = useTranslation();
  const uppercase = useUppercase();

  if (status === 'current') {
    return null;
  }
  const text = TEXTS[status];
  const leave = () => {
    if (status === 'update-app') {
      BackHandler.exitApp();
    } else if (status === 'failed') {
      postpone();
    }
  };

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={leave}>
      <Screen contentStyle={styles.content}>
        <View style={styles.center} accessibilityViewIsModal>
          <View style={styles.ball}>
            <GoalIcon size={BALL_SIZE} />
          </View>
          <ThemedText type="title" themeColor="volt" style={styles.centered} accessibilityRole="header">
            {uppercase(t(text.title))}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centered}>
            {t(text.body)}
          </ThemedText>
          {status === 'downloading' ? <ActivityIndicator size="large" color={Colors.volt} /> : null}
        </View>
        {status === 'update-app' ? <ActionButton label={t('update.action')} onPress={openStoreListing} /> : null}
        {status === 'failed' ? (
          <View style={styles.actions}>
            <ActionButton label={t('update.retry')} onPress={retry} />
            <ActionButton label={t('update.later')} onPress={leave} variant="secondary" />
          </View>
        ) : null}
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  center: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  ball: {
    alignItems: 'center',
  },
  centered: {
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.two,
  },
});
