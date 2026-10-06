import { BlurMask, Canvas, Path, Skia, rect } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Easing, cancelAnimation, useSharedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

const SIZE = 88;
const STROKE = 7;
const GLOW = 6;
const INSET = STROKE / 2 + GLOW;

const RING = Skia.Path.Make();
RING.addArc(rect(INSET, INSET, SIZE - INSET * 2, SIZE - INSET * 2), -90, 360);

interface TurnTimerProps {
  turnEndsAt: number;
  totalSeconds: number;
  secondsLeft: number;
  color: string;
  running: boolean;
  accessibilityLabel: string;
}

export function TurnTimer({ turnEndsAt, totalSeconds, secondsLeft, color, running, accessibilityLabel }: TurnTimerProps) {
  const progress = useSharedValue(1);

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

  return (
    <View style={styles.container} accessible accessibilityRole="timer" accessibilityLabel={accessibilityLabel}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Path path={RING} style="stroke" strokeWidth={STROKE} color={Colors.surfaceRaised} />
        <Path path={RING} style="stroke" strokeWidth={STROKE} strokeCap="round" color={color} start={0} end={progress}>
          <BlurMask blur={GLOW / 2} style="solid" />
        </Path>
      </Canvas>
      <ThemedText type="score" style={[styles.seconds, { color }]}>
        {secondsLeft}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seconds: {
    fontSize: 34,
    lineHeight: 38,
  },
});
