import { BlurMask, Canvas, Circle } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Easing, useDerivedValue, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

const SPARK_COUNT = 12;
const DURATION = 620;
const SPARKS = Array.from({ length: SPARK_COUNT }, (_, index) => ({
  angle: (index / SPARK_COUNT) * Math.PI * 2 + (index % 2) * 0.22,
  reach: 0.75 + (index % 3) * 0.22,
  radius: 2 + (index % 3),
}));

interface SparkProps {
  angle: number;
  reach: number;
  radius: number;
  x: number;
  y: number;
  size: number;
  color: string;
  progress: SharedValue<number>;
}

function Spark({ angle, reach, radius, x, y, size, color, progress }: SparkProps) {
  const cx = useDerivedValue(() => x + Math.cos(angle) * reach * size * progress.get());
  const cy = useDerivedValue(() => y + Math.sin(angle) * reach * size * progress.get());
  const opacity = useDerivedValue(() => 1 - progress.get());
  return <Circle cx={cx} cy={cy} r={radius} color={color} opacity={opacity} />;
}

interface ClaimBurstProps {
  x: number;
  y: number;
  size: number;
  color: string;
}

export function ClaimBurst({ x, y, size, color }: ClaimBurstProps) {
  const progress = useSharedValue(0);
  const ringRadius = useDerivedValue(() => size * (0.35 + progress.get() * 0.75));
  const ringOpacity = useDerivedValue(() => 1 - progress.get());
  const flashOpacity = useDerivedValue(() => Math.max(0, 0.55 - progress.get() * 1.6));

  useEffect(() => {
    progress.set(withTiming(1, { duration: DURATION, easing: Easing.out(Easing.cubic) }));
  }, [progress]);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Circle cx={x} cy={y} r={size * 0.8} color={color} opacity={flashOpacity}>
        <BlurMask blur={size * 0.35} style="normal" />
      </Circle>
      <Circle cx={x} cy={y} r={ringRadius} color={color} style="stroke" strokeWidth={3} opacity={ringOpacity} />
      {SPARKS.map((spark, index) => (
        <Spark key={index} {...spark} x={x} y={y} size={size} color={color} progress={progress} />
      ))}
    </Canvas>
  );
}
