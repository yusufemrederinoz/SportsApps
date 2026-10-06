import type { Side } from '@sportapps/game-core';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useUppercase } from '@/i18n/uppercase';

interface ScoreboardProps {
  names: Record<Side, string>;
  scores: Record<Side, number>;
  activeSide: Side | null;
  center: ReactNode;
}

const SIDE_COLORS: Record<Side, string> = { x: Colors.sideX, o: Colors.sideO };

function SidePanel({ side, name, score, active }: { side: Side; name: string; score: number; active: boolean }) {
  const uppercase = useUppercase();
  const color = SIDE_COLORS[side];
  return (
    <View
      accessible
      accessibilityLabel={`${name}: ${score}`}
      style={[
        styles.panel,
        side === 'o' && styles.panelReversed,
        { borderColor: active ? color : Colors.border },
        active && { shadowColor: color, shadowOpacity: 0.6, shadowRadius: 10, elevation: 6 },
      ]}>
      <View style={[styles.marker, { backgroundColor: color }]} />
      <ThemedText type="label" numberOfLines={1} style={styles.name} themeColor={active ? 'text' : 'textSecondary'}>
        {uppercase(name)}
      </ThemedText>
      <ThemedText type="score" style={{ color }}>
        {score}
      </ThemedText>
    </View>
  );
}

export function Scoreboard({ names, scores, activeSide, center }: ScoreboardProps) {
  return (
    <View style={styles.container}>
      <SidePanel side="x" name={names.x} score={scores.x} active={activeSide === 'x'} />
      <View style={styles.center}>{center}</View>
      <SidePanel side="o" name={names.o} score={scores.o} active={activeSide === 'o'} />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 56,
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.two,
    backgroundColor: Colors.surface,
    shadowOffset: { width: 0, height: 0 },
  },
  panelReversed: {
    flexDirection: 'row-reverse',
  },
  marker: {
    width: 6,
    height: 28,
    borderRadius: 3,
  },
  name: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
