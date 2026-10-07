import type { Side } from '@sportapps/game-core';
import { Canvas, Group, LinearGradient, Path, Rect, vec } from '@shopify/react-native-skia';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Keyframe,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { portraitUrl } from '@/api';
import { platePath } from '@/components/metal-plate';
import { ThemedText } from '@/components/themed-text';
import { Finishes, Fonts, Motion } from '@/constants/theme';

import { flagEmoji } from './flags';
import type { PlayedFootballer } from './session';

export type CardEmphasis = 'none' | 'winner' | 'dimmed';

const STREAK = 'rgba(255, 255, 255, 0.20)';
const SHINE = 'rgba(255, 255, 255, 0.85)';
const SHINE_FADE = 'rgba(255, 255, 255, 0)';
const BANNER = 'rgba(0, 0, 0, 0.42)';
const PORTRAIT_SCALE = 0.96;
const PORTRAIT_LEFT = 0.1;
const PORTRAIT_TOP = -0.13;
const ROLE_KEYS = { GK: 'role.GK', DF: 'role.DF', MF: 'role.MF', FW: 'role.FW' } as const;

const WALKOUT = new Keyframe({
  0: { opacity: 0, transform: [{ perspective: 700 }, { scale: 1.9 }, { rotateY: '95deg' }] },
  55: { opacity: 1, transform: [{ perspective: 700 }, { scale: 0.92 }, { rotateY: '0deg' }] },
  78: { opacity: 1, transform: [{ perspective: 700 }, { scale: 1.06 }, { rotateY: '0deg' }] },
  100: { opacity: 1, transform: [{ perspective: 700 }, { scale: 1 }, { rotateY: '0deg' }] },
}).duration(560);

interface FootballerCardProps {
  footballer: PlayedFootballer | null;
  side: Side;
  size: number;
  emphasis: CardEmphasis;
  watermark?: boolean;
}

export function FootballerCard({ footballer, side, size, emphasis, watermark = true }: FootballerCardProps) {
  const { t } = useTranslation();
  const finish = Finishes[side];
  const shine = useSharedValue(0);
  const pulse = useSharedValue(0);
  const shineTransform = useDerivedValue(() => [{ translateX: -size + shine.get() * size * 2.2 }, { skewX: -0.35 }]);
  const emphasisStyle = useAnimatedStyle(() => ({
    opacity: emphasis === 'dimmed' ? 0.38 : 1,
    transform: [{ scale: 1 + pulse.get() * 0.07 }],
  }));

  useEffect(() => {
    shine.set(withDelay(Motion.slow, withTiming(1, { duration: Motion.cinematic, easing: Easing.out(Easing.quad) })));
  }, [shine]);

  useEffect(() => {
    if (emphasis === 'winner') {
      pulse.set(withRepeat(withSequence(withTiming(1, { duration: 380 }), withTiming(0, { duration: 380 })), -1));
      shine.set(withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1));
    }
  }, [emphasis, pulse, shine]);

  const path = platePath(size, size, size * 0.12, 'right', size * 0.2);
  const roleKey = footballer?.role && footballer.role in ROLE_KEYS ? ROLE_KEYS[footballer.role as keyof typeof ROLE_KEYS] : null;
  const flag = flagEmoji(footballer?.countryCode ?? null);
  const bannerTop = size * 0.62;
  const portrait = footballer?.hasPortrait ? portraitUrl(footballer.id) : null;
  const portraitSize = size * PORTRAIT_SCALE;

  return (
    <Animated.View entering={WALKOUT} style={{ width: size, height: size }}>
      <Animated.View style={[styles.fill, { shadowColor: finish.base }, styles.glow, emphasisStyle]}>
        <Canvas style={styles.fill} pointerEvents="none">
          <Group clip={path}>
            <Rect x={0} y={0} width={size} height={size}>
              <LinearGradient
                start={vec(0, 0)}
                end={vec(size * 0.5, size)}
                colors={[finish.light, finish.base, finish.deep]}
                positions={[0, 0.42, 1]}
              />
            </Rect>
            <Rect x={-size * 0.2} y={0} width={size * 0.22} height={size * 1.6} color={STREAK} transform={[{ rotate: -0.5 }]} />
            <Rect x={size * 0.28} y={-size * 0.3} width={size * 0.1} height={size * 1.8} color={STREAK} transform={[{ rotate: -0.5 }]} />
            <Rect x={0} y={bannerTop} width={size} height={size - bannerTop} color={BANNER} />
            <Group transform={shineTransform}>
              <Rect x={0} y={0} width={size * 0.36} height={size}>
                <LinearGradient start={vec(0, 0)} end={vec(size * 0.36, 0)} colors={[SHINE_FADE, SHINE, SHINE_FADE]} />
              </Rect>
            </Group>
          </Group>
          <Path path={path} style="stroke" strokeWidth={2} color={finish.light} />
        </Canvas>
        <View style={[styles.fill, styles.content]} pointerEvents="none">
          {watermark ? (
            <ThemedText style={[styles.watermark, { color: finish.ink, fontSize: size * 0.62, lineHeight: size * 0.66 }]}>
              {side.toUpperCase()}
            </ThemedText>
          ) : null}
          {portrait ? (
            <View style={[styles.portraitWindow, { height: bannerTop }]}>
              <Image
                source={{ uri: portrait }}
                style={{
                  position: 'absolute',
                  width: portraitSize,
                  height: portraitSize,
                  left: size * PORTRAIT_LEFT,
                  top: size * PORTRAIT_TOP,
                }}
                contentFit="cover"
                cachePolicy="disk"
                transition={Motion.base}
                accessible={false}
              />
            </View>
          ) : null}
          <View style={styles.badges}>
            <ThemedText style={[styles.role, { color: finish.ink, fontSize: size * 0.2, lineHeight: size * 0.22 }]}>
              {roleKey ? t(roleKey) : ''}
            </ThemedText>
            {flag ? <ThemedText style={{ fontSize: size * 0.17, lineHeight: size * 0.22 }}>{flag}</ThemedText> : null}
          </View>
          <View style={[styles.banner, { top: bannerTop }]}>
            <ThemedText
              style={[styles.name, { fontSize: size * 0.16, lineHeight: size * 0.18 }]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.6}>
              {footballer?.name ?? ''}
            </ThemedText>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  glow: {
    shadowOpacity: 0.85,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  content: {
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    right: 4,
    top: 0,
    fontFamily: Fonts.display,
    opacity: 0.16,
  },
  portraitWindow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  badges: {
    position: 'absolute',
    top: 4,
    left: 6,
    alignItems: 'flex-start',
  },
  role: {
    fontFamily: Fonts.display,
  },
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  name: {
    fontFamily: Fonts.heading,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
