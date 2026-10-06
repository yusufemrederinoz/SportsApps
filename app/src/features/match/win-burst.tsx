import { Canvas, Circle } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Easing, useDerivedValue, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { Colors } from '@/constants/theme';

const PARTICLE_COUNT = 36;
const DURATION = 1600;
const GRAVITY = 0.55;
const PALETTE = [Colors.gold, Colors.pitch, Colors.sideX, Colors.sideO, Colors.floodlight];

interface Particle {
  angle: number;
  speed: number;
  radius: number;
  color: string;
}

function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

const PARTICLES: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
  angle: (index / PARTICLE_COUNT) * Math.PI * 2 + pseudoRandom(index + 1) * 0.4,
  speed: 0.35 + pseudoRandom(index + 11) * 0.65,
  radius: 3 + pseudoRandom(index + 23) * 4,
  color: PALETTE[index % PALETTE.length] as string,
}));

interface ParticleDotProps {
  particle: Particle;
  progress: SharedValue<number>;
  originX: number;
  originY: number;
  reach: number;
}

function ParticleDot({ particle, progress, originX, originY, reach }: ParticleDotProps) {
  const cx = useDerivedValue(() => originX + Math.cos(particle.angle) * particle.speed * reach * progress.get());
  const cy = useDerivedValue(
    () =>
      originY +
      Math.sin(particle.angle) * particle.speed * reach * progress.get() +
      GRAVITY * reach * progress.get() * progress.get(),
  );
  const opacity = useDerivedValue(() => 1 - progress.get() * progress.get());
  return <Circle cx={cx} cy={cy} r={particle.radius} color={particle.color} opacity={opacity} />;
}

export function WinBurst() {
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withTiming(1, { duration: DURATION, easing: Easing.out(Easing.cubic) }));
  }, [progress]);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {PARTICLES.map((particle, index) => (
        <ParticleDot
          key={index}
          particle={particle}
          progress={progress}
          originX={width / 2}
          originY={height * 0.42}
          reach={width * 0.6}
        />
      ))}
    </Canvas>
  );
}
