import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { MetalPlate } from '@/components/metal-plate';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Motion, Spacing, type Finish } from '@/constants/theme';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const PRESSED_SCALE = 0.96;

interface ModeCardProps {
  title: string;
  hint: string;
  finish: Finish;
  onPress: () => void;
}

export function ModeCard({ title, hint, finish, onPress }: ModeCardProps) {
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
      style={[styles.pressable, { shadowColor: finish.base }, pressStyle]}>
      <MetalPlate finish={finish} cut="right" cutSize={26} radius={16} style={styles.plate}>
        <View style={styles.content}>
          <View style={styles.texts}>
            <ThemedText style={[styles.title, { color: finish.ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
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
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  plate: {
    minHeight: 96,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
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
  chevron: {
    fontFamily: Fonts.heading,
    fontSize: 44,
    lineHeight: 44,
    color: Colors.onAccent,
  },
});
