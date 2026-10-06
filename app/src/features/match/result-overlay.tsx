import { Canvas, Circle, Group, SweepGradient, vec } from '@shopify/react-native-skia';
import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  Keyframe,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ActionButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MaxContentWidth, Motion, Spacing } from '@/constants/theme';
import { useUppercase } from '@/i18n/uppercase';

import { WinBurst } from './win-burst';

const RAY_COUNT = 12;
const RAY_ROTATION_MILLISECONDS = 16000;
const TITLE_SLAM = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 3.2 }] },
  50: { opacity: 1, transform: [{ scale: 0.92 }] },
  72: { opacity: 1, transform: [{ scale: 1.06 }] },
  100: { opacity: 1, transform: [{ scale: 1 }] },
}).duration(Motion.cinematic);

function rayColors(color: string): string[] {
  return Array.from({ length: RAY_COUNT * 2 + 1 }, (_, index) => (index % 2 === 0 ? 'rgba(0, 0, 0, 0)' : color));
}

function LightRays({ color }: { color: string }) {
  const { width, height } = useWindowDimensions();
  const turn = useSharedValue(0);
  const center = vec(width / 2, height * 0.36);
  const transform = useDerivedValue(() => [{ rotate: turn.get() * Math.PI * 2 }]);

  useEffect(() => {
    turn.set(withRepeat(withTiming(1, { duration: RAY_ROTATION_MILLISECONDS, easing: Easing.linear }), -1));
  }, [turn]);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Group origin={center} transform={transform} opacity={0.22}>
        <Circle cx={center.x} cy={center.y} r={Math.max(width, height)}>
          <SweepGradient c={center} colors={rayColors(color)} />
        </Circle>
      </Group>
    </Canvas>
  );
}

interface ResultOverlayProps {
  title: string;
  detail: string;
  score: string;
  tone: 'win' | 'loss' | 'draw';
  playAgainLabel: string;
  homeLabel: string;
  onPlayAgain: () => void;
  onHome: () => void;
}

const TONE_COLORS = { win: Colors.gold, loss: Colors.negative, draw: Colors.text } as const;

export function ResultOverlay({ title, detail, score, tone, playAgainLabel, homeLabel, onPlayAgain, onHome }: ResultOverlayProps) {
  const uppercase = useUppercase();
  const color = TONE_COLORS[tone];

  return (
    <Animated.View entering={FadeIn.duration(Motion.base)} style={styles.overlay} accessibilityViewIsModal>
      {tone === 'win' ? <LightRays color={color} /> : null}
      <View style={styles.content}>
        <Animated.View entering={TITLE_SLAM} style={styles.titleBlock}>
          <ThemedText
            accessibilityRole="header"
            style={[styles.title, { color, textShadowColor: color }]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.6}>
            {uppercase(title)}
          </ThemedText>
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(Motion.slow).delay(Motion.slow)} style={styles.titleBlock}>
          <ThemedText type="score" themeColor="text">
            {score}
          </ThemedText>
          <ThemedText type="label" themeColor="textSecondary">
            {uppercase(detail)}
          </ThemedText>
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(Motion.slow).delay(Motion.cinematic)} style={styles.actions}>
          <ActionButton label={playAgainLabel} onPress={onPlayAgain} />
          <ActionButton label={homeLabel} onPress={onHome} variant="secondary" />
        </Animated.View>
      </View>
      {tone === 'win' ? <WinBurst /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5, 7, 10, 0.9)',
  },
  content: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
  },
  titleBlock: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 76,
    lineHeight: 74,
    textAlign: 'center',
    textShadowRadius: 26,
    textShadowOffset: { width: 0, height: 0 },
  },
  actions: {
    alignSelf: 'stretch',
    gap: Spacing.three,
  },
});
