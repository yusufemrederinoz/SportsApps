import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors, MinimumTouchSize, Motion, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESSED_SCALE = 0.97;

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

export function ActionButton({ label, onPress, variant = 'primary' }: ActionButtonProps) {
  const uppercase = useUppercase();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const primary = variant === 'primary';

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => {
        scale.set(withTiming(PRESSED_SCALE, { duration: Motion.quick }));
      }}
      onPressOut={() => {
        scale.set(withSpring(1));
      }}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={[styles.button, primary ? styles.primary : styles.secondary, animatedStyle]}>
      <ThemedText type="label" style={styles.label} themeColor={primary ? 'onAccent' : 'text'}>
        {uppercase(label)}
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MinimumTouchSize + Spacing.two,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
  },
  primary: {
    backgroundColor: Colors.pitch,
    shadowColor: Colors.pitch,
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  secondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    fontSize: 18,
    lineHeight: 22,
  },
});
