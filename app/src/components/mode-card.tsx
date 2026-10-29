import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { MetalPlate } from '@/components/metal-plate';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Motion, Spacing, type Finish } from '@/constants/theme';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESSED_SCALE = 0.96;
const GLOW = 12;

interface ModeCardProps {
  title: string;
  hint: string;
  finish: Finish;
  onPress: () => void;
  compact?: boolean;
}

export function ModeCard({ title, hint, finish, onPress, compact = false }: ModeCardProps) {
  const uppercase = useUppercase();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={hint}
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
      <MetalPlate finish={finish} cut="right" cutSize={26} radius={16} glow={GLOW} style={[styles.plate, compact && styles.compactPlate]}>
        <View style={[styles.content, compact && styles.compactContent]}>
          <View style={styles.texts}>
            <ThemedText
              style={[styles.title, compact && styles.compactTitle, { color: finish.ink }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}>
              {uppercase(title)}
            </ThemedText>
            <ThemedText type="small" style={{ color: finish.ink }}>
              {hint}
            </ThemedText>
          </View>
          <ThemedText style={[styles.chevron, { color: finish.ink }]}>›</ThemedText>
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
    minHeight: 96,
    justifyContent: 'center',
  },
  compactPlate: {
    minHeight: 76,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  compactContent: {
    paddingVertical: Spacing.two,
  },
  texts: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 36,
    lineHeight: 38,
  },
  compactTitle: {
    fontSize: 30,
    lineHeight: 32,
  },
  chevron: {
    fontFamily: Fonts.heading,
    fontSize: 44,
    lineHeight: 44,
    color: Colors.onAccent,
  },
});
