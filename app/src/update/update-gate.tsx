import { useTranslation } from 'react-i18next';
import { BackHandler, Modal, StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { GoalIcon } from '@/components/goal-icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useUppercase } from '@/i18n/uppercase';

import { openStoreListing } from './open-store-listing';
import { useUpdateRequired } from './use-update-required';

const BALL_SIZE = 112;

export function UpdateGate() {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const required = useUpdateRequired();

  return (
    <Modal visible={required} animationType="fade" statusBarTranslucent onRequestClose={() => BackHandler.exitApp()}>
      <Screen contentStyle={styles.content}>
        <View style={styles.center} accessibilityViewIsModal>
          <View style={styles.ball}>
            <GoalIcon size={BALL_SIZE} />
          </View>
          <ThemedText type="title" themeColor="volt" style={styles.centered} accessibilityRole="header">
            {uppercase(t('update.title'))}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centered}>
            {t('update.body')}
          </ThemedText>
        </View>
        <ActionButton label={t('update.action')} onPress={openStoreListing} />
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
});
