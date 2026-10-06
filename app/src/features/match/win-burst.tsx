import { Canvas, Group, Rect } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Easing, useDerivedValue, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { Colors, Finishes } from '@/constants/theme';

const PIECE_COUNT = 54;
const DURATION = 2600;
const PALETTE = [Finishes.x.base, Finishes.x.light, Colors.volt, Finishes.o.base, '#FFFFFF'];

interface Piece {
  lane: number;
  drift: number;
  fall: number;
  delay: number;
  spin: number;
  width: number;
  height: number;
  color: string;
}

function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

const PIECES: Piece[] = Array.from({ length: PIECE_COUNT }, (_, index) => ({
  lane: pseudoRandom(index + 1),
  drift: pseudoRandom(index + 17) - 0.5,
  fall: 0.75 + pseudoRandom(index + 31) * 0.5,
  delay: pseudoRandom(index + 47) * 0.35,
  spin: (pseudoRandom(index + 59) - 0.5) * 14,
  width: 5 + pseudoRandom(index + 71) * 6,
  height: 9 + pseudoRandom(index + 83) * 9,
  color: PALETTE[index % PALETTE.length] as string,
}));

interface ConfettiPieceProps {
  piece: Piece;
  progress: SharedValue<number>;
  width: number;
  height: number;
}

function ConfettiPiece({ piece, progress, width, height }: ConfettiPieceProps) {
  const transform = useDerivedValue(() => {
    const local = Math.max(0, Math.min(1, (progress.get() - piece.delay) / (1 - piece.delay)));
    return [
      { translateX: piece.lane * width + piece.drift * width * 0.3 * local },
      { translateY: -40 + local * height * 1.1 * piece.fall },
      { rotate: piece.spin * local },
    ];
  });
  const opacity = useDerivedValue(() => (progress.get() > 0.85 ? (1 - progress.get()) / 0.15 : 1));
  return (
    <Group transform={transform} opacity={opacity}>
      <Rect x={-piece.width / 2} y={-piece.height / 2} width={piece.width} height={piece.height} color={piece.color} />
    </Group>
  );
}

export function WinBurst() {
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withTiming(1, { duration: DURATION, easing: Easing.out(Easing.quad) }));
  }, [progress]);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {PIECES.map((piece, index) => (
        <ConfettiPiece key={index} piece={piece} progress={progress} width={width} height={height} />
      ))}
    </Canvas>
  );
}
