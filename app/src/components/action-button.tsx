import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MinimumTouchSize, Motion, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESSED_SCALE = 0.96;
const SHINE_WIDTH = 46;
const SHINE_TRAVEL = 460;
const SHINE_PAUSE = 2600;

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

export function ActionButton({ label, onPress, variant = 'primary' }: ActionButtonProps) {
  const uppercase = useUppercase();
  const scale = useSharedValue(1);
  const shine = useSharedValue(0);
  const primary = variant === 'primary';
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -SHINE_WIDTH * 2 + shine.get() * SHINE_TRAVEL }, { rotate: '18deg' }],
  }));

  useEffect(() => {
    if (primary) {
      shine.set(
        withRepeat(
          withSequence(
            withDelay(SHINE_PAUSE, withTiming(1, { duration: Motion.cinematic, easing: Easing.out(Easing.quad) })),
            withTiming(0, { duration: 0 }),
          ),
          -1,
        ),
      );
    }
  }, [primary, shine]);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => {
        scale.set(withTiming(PRESSED_SCALE, { duration: Motion.quick }));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, { damping: 11, stiffness: 260 }));
      }}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={[styles.button, primary ? styles.primary : styles.secondary, pressStyle]}>
      {primary ? (
        <View style={styles.shineClip} pointerEvents="none">
          <Animated.View style={[styles.shine, shineStyle]} />
        </View>
      ) : null}
      <ThemedText style={[styles.label, { color: primary ? Colors.onAccent : Colors.text }]}>{uppercase(label)}</ThemedText>
      <ThemedText style={[styles.chevron, { color: primary ? Colors.onAccent : Colors.volt }]}>›</ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MinimumTouchSize + Spacing.two,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.four,
  },
  primary: {
    backgroundColor: Colors.volt,
    borderWidth: 1.5,
    borderColor: '#E9FFA6',
    shadowColor: Colors.volt,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  secondary: {
    backgroundColor: Colors.panel,
    borderWidth: 1.5,
    borderColor: Colors.strokeBright,
  },
  shineClip: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: Radius.medium,
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    top: -30,
    bottom: -30,
    width: SHINE_WIDTH,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  label: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: 24,
    lineHeight: 26,
    letterSpacing: 0.5,
  },
  chevron: {
    fontFamily: Fonts.heading,
    fontSize: 30,
    lineHeight: 30,
  },
});
