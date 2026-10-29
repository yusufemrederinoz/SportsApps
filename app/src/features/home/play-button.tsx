import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { MetalPlate } from '@/components/metal-plate';
import { ThemedText } from '@/components/themed-text';
import { AccentFinishes, Fonts, Motion, Spacing } from '@/constants/theme';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESSED_SCALE = 0.95;
const BREATH_MILLISECONDS = 1600;
const FINISH = AccentFinishes.volt;
const GLOW = 16;

interface PlayButtonProps {
  label: string;
  hint: string;
  onPress: () => void;
}

export function PlayButton({ label, hint, onPress }: PlayButtonProps) {
  const uppercase = useUppercase();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const breath = useSharedValue(0);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() * (1 + breath.get() * 0.025) }] }));

  useEffect(() => {
    if (!reduceMotion) {
      breath.set(withRepeat(withTiming(1, { duration: BREATH_MILLISECONDS, easing: Easing.inOut(Easing.sin) }), -1, true));
    }
  }, [breath, reduceMotion]);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${hint}`}
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
      style={[styles.pressable, pressStyle]}>
      <MetalPlate finish={FINISH} cut="right" cutSize={24} radius={18} glow={GLOW} style={styles.plate}>
        <View style={styles.content}>
          <ThemedText style={styles.label}>{uppercase(label)}</ThemedText>
          <View style={styles.triangle} />
        </View>
      </MetalPlate>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'stretch',
  },
  plate: {
    minHeight: 76,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  label: {
    fontFamily: Fonts.display,
    fontSize: 44,
    lineHeight: 48,
    color: FINISH.ink,
  },
  triangle: {
    width: 0,
    height: 0,
    borderTopWidth: 13,
    borderBottomWidth: 13,
    borderLeftWidth: 20,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: FINISH.ink,
  },
});
