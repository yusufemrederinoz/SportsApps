import { Canvas, Group, LinearGradient, Path, Rect, vec } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { platePath } from '@/components/metal-plate';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Motion, type Finish } from '@/constants/theme';

const STRIPE = 'rgba(255, 255, 255, 0.06)';
const STRIPES = [-0.1, 0.2, 0.5, 0.8];
const MARK = '?';

interface CardBackProps {
  size: number;
  finish: Finish;
  accessibilityLabel: string;
}

export function CardBack({ size, finish, accessibilityLabel }: CardBackProps) {
  const path = platePath(size, size, size * 0.12, 'right', size * 0.2);

  return (
    <Animated.View
      entering={FadeIn.duration(Motion.base)}
      accessible
      accessibilityLabel={accessibilityLabel}
      style={{ width: size, height: size }}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Group clip={path}>
          <Rect x={0} y={0} width={size} height={size}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(size * 0.6, size)}
              colors={[Colors.panelRaised, Colors.panel, Colors.ink]}
              positions={[0, 0.5, 1]}
            />
          </Rect>
          {STRIPES.map((offset) => (
            <Rect
              key={offset}
              x={size * offset}
              y={-size * 0.3}
              width={size * 0.12}
              height={size * 1.8}
              color={STRIPE}
              transform={[{ rotate: -0.5 }]}
            />
          ))}
        </Group>
        <Path path={path} style="stroke" strokeWidth={2} color={finish.base} />
      </Canvas>
      <View style={styles.center} pointerEvents="none">
        <ThemedText style={[styles.mark, { color: finish.base, fontSize: size * 0.56, lineHeight: size * 0.6 }]}>{MARK}</ThemedText>
      </View>
    </Animated.View>
  );
}

interface EmptySlotProps {
  size: number;
  color: string;
  waiting: boolean;
  accessibilityLabel: string;
}

export function EmptySlot({ size, color, waiting, accessibilityLabel }: EmptySlotProps) {
  const glow = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ opacity: 0.35 + glow.get() * 0.5 }));

  useEffect(() => {
    glow.set(
      waiting
        ? withRepeat(
            withSequence(
              withTiming(1, { duration: Motion.cinematic, easing: Easing.inOut(Easing.quad) }),
              withTiming(0, { duration: Motion.cinematic, easing: Easing.inOut(Easing.quad) }),
            ),
            -1,
          )
        : withTiming(0, { duration: Motion.base }),
    );
  }, [glow, waiting]);

  return (
    <Animated.View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={[styles.empty, { width: size, height: size, borderRadius: size * 0.12, borderColor: color }, style]}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  mark: {
    fontFamily: Fonts.display,
    textAlign: 'center',
  },
  empty: {
    borderWidth: 2,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(18, 24, 33, 0.6)',
  },
});
