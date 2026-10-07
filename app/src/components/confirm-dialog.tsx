import { Modal, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { ActionButton } from '@/components/action-button';
import { MetalPlate } from '@/components/metal-plate';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MaxContentWidth, Motion, Spacing } from '@/constants/theme';
import { useUppercase } from '@/i18n/uppercase';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const uppercase = useUppercase();

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onCancel}>
      <Animated.View entering={FadeIn.duration(Motion.base)} style={styles.backdrop}>
        <Animated.View entering={ZoomIn.duration(Motion.base)} style={styles.panel} accessibilityViewIsModal>
          <MetalPlate finish={null} cut="right" cutSize={22} radius={16} style={styles.plate}>
            <View style={styles.texts}>
              <ThemedText accessibilityRole="header" style={styles.title}>
                {uppercase(title)}
              </ThemedText>
              <ThemedText themeColor="textSecondary">{message}</ThemedText>
            </View>
            <View style={styles.actions}>
              <ActionButton label={cancelLabel} onPress={onCancel} />
              <ActionButton label={confirmLabel} onPress={onConfirm} variant="secondary" />
            </View>
          </MetalPlate>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    backgroundColor: 'rgba(5, 7, 10, 0.82)',
  },
  panel: {
    alignSelf: 'stretch',
    maxWidth: MaxContentWidth,
  },
  plate: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  texts: {
    gap: Spacing.two,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 34,
    lineHeight: 36,
    color: Colors.negative,
  },
  actions: {
    gap: Spacing.three,
  },
});
