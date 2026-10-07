import type { Side } from '@sportapps/game-core';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { MetalPlate } from '@/components/metal-plate';
import { ThemedText } from '@/components/themed-text';
import { Colors, Finishes, Fonts, Spacing } from '@/constants/theme';
import { useUppercase } from '@/i18n/uppercase';

import { ownSideFirst } from './sides';

interface ScoreboardProps {
  side: Side;
  names: Record<Side, string>;
  scores: Record<Side, number>;
  activeSide: Side | null;
  center: ReactNode;
  compact?: boolean;
}

interface SidePanelProps {
  side: Side;
  edge: 'left' | 'right';
  name: string;
  score: number;
  active: boolean;
  compact: boolean;
}

function SidePanel({ side, edge, name, score, active, compact }: SidePanelProps) {
  const uppercase = useUppercase();
  const finish = Finishes[side];
  const bump = useSharedValue(1);
  const bumpStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.get() }] }));
  const textColor = active ? finish.ink : finish.base;

  useEffect(() => {
    if (score > 0) {
      bump.set(withSequence(withTiming(1.5, { duration: 110 }), withSpring(1, { damping: 8, stiffness: 220 })));
    }
  }, [bump, score]);

  return (
    <MetalPlate
      finish={active ? finish : null}
      cut={edge}
      style={[styles.panel, active && { shadowColor: finish.base }, active && styles.glow]}>
      <View
        accessible
        accessibilityLabel={`${name}: ${score}`}
        accessibilityState={{ selected: active }}
        style={[styles.panelContent, edge === 'right' && styles.reversed]}>
        <ThemedText style={[styles.name, { color: textColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {uppercase(name)}
        </ThemedText>
        <Animated.View style={bumpStyle}>
          <ThemedText type="score" style={[{ color: textColor }, compact && styles.compactScore]}>
            {score}
          </ThemedText>
        </Animated.View>
      </View>
    </MetalPlate>
  );
}

export function Scoreboard({ side, names, scores, activeSide, center, compact = false }: ScoreboardProps) {
  const [left, right] = ownSideFirst(side);
  return (
    <View style={styles.container}>
      <SidePanel side={left} edge="left" name={names[left]} score={scores[left]} active={activeSide === left} compact={compact} />
      <View style={styles.center}>{center}</View>
      <SidePanel side={right} edge="right" name={names[right]} score={scores[right]} active={activeSide === right} compact={compact} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  panel: {
    flex: 1,
    height: 64,
    justifyContent: 'center',
  },
  glow: {
    shadowOpacity: 0.8,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  panelContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  reversed: {
    flexDirection: 'row-reverse',
  },
  name: {
    flex: 1,
    fontFamily: Fonts.heading,
    fontSize: 18,
    lineHeight: 20,
    letterSpacing: 0.6,
    color: Colors.text,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactScore: {
    fontSize: 26,
    lineHeight: 28,
  },
});
