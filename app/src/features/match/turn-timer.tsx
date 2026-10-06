import { BlurMask, Canvas, Circle, Path, Skia, rect } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

const SIZE = 96;
const STROKE = 7;
const GLOW = 7;
const INSET = STROKE / 2 + GLOW;

const RING = Skia.Path.Make();
RING.addArc(rect(INSET, INSET, SIZE - INSET * 2, SIZE - INSET * 2), -90, 360);

interface TurnTimerProps {
  turnEndsAt: number;
  totalSeconds: number;
  secondsLeft: number;
  color: string;
  running: boolean;
  urgent: boolean;
  accessibilityLabel: string;
}

export function TurnTimer({ turnEndsAt, totalSeconds, secondsLeft, color, running, urgent, accessibilityLabel }: TurnTimerProps) {
  const progress = useSharedValue(1);
  const beat = useSharedValue(1);
  const beatStyle = useAnimatedStyle(() => ({ transform: [{ scale: beat.get() }] }));

  useEffect(() => {
    if (!running) {
      cancelAnimation(progress);
      return;
    }
    const remaining = Math.max(0, turnEndsAt - Date.now());
    progress.set(Math.min(1, remaining / (totalSeconds * 1000)));
    progress.set(withTiming(0, { duration: remaining, easing: Easing.linear }));
    return () => cancelAnimation(progress);
  }, [progress, running, totalSeconds, turnEndsAt]);

  useEffect(() => {
    if (running && urgent) {
      beat.set(withSequence(withTiming(1.2, { duration: 90 }), withSpring(1, { damping: 7, stiffness: 240 })));
    }
  }, [beat, running, urgent, secondsLeft]);

  return (
    <Animated.View
      style={[styles.container, beatStyle]}
      accessible
      accessibilityRole="timer"
      accessibilityLabel={accessibilityLabel}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2 - INSET} color={Colors.ink} opacity={0.85} />
        <Path path={RING} style="stroke" strokeWidth={STROKE} color={Colors.stroke} />
        <Path path={RING} style="stroke" strokeWidth={STROKE} strokeCap="round" color={color} start={0} end={progress}>
          <BlurMask blur={GLOW / 2} style="solid" />
        </Path>
      </Canvas>
      <ThemedText type="score" style={{ color }}>
        {secondsLeft}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
