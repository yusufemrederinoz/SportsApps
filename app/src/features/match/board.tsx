import { BOARD_SIZE, cellIndex, type CellPosition, type Side } from '@sportapps/game-core';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { GridView, HeaderView } from '@/data/types';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

import { flagEmoji } from './flags';
import type { MatchSession } from './session';

const INDEXES = Array.from({ length: BOARD_SIZE }, (_, index) => index);
const SIDE_COLORS: Record<Side, string> = { x: Colors.sideX, o: Colors.sideO };

interface BoardProps {
  gridView: GridView;
  session: MatchSession;
  disabled: boolean;
  onSelectCell: (position: CellPosition) => void;
}

function HeaderCell({ header }: { header: HeaderView }) {
  const uppercase = useUppercase();
  const flag = flagEmoji(header.countryCode);
  return (
    <View style={[styles.cell, styles.header]} accessible accessibilityLabel={header.name}>
      {flag ? <ThemedText style={styles.flag}>{flag}</ThemedText> : null}
      <ThemedText type="label" style={styles.headerLabel} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.7}>
        {uppercase(header.name)}
      </ThemedText>
    </View>
  );
}

export function Board({ gridView, session, disabled, onSelectCell }: BoardProps) {
  return (
    <View style={styles.board}>
      <View style={styles.row}>
        <View style={styles.cell} />
        {gridView.columns.map((header) => (
          <HeaderCell key={`${header.kind}-${header.referenceId}`} header={header} />
        ))}
      </View>
      {INDEXES.map((row) => {
        const rowHeader = gridView.rows[row] as HeaderView;
        return (
          <View key={row} style={styles.row}>
            <HeaderCell header={rowHeader} />
            {INDEXES.map((column) => {
              const mark = session.match.cells[cellIndex({ row, column })] ?? null;
              const columnHeader = gridView.columns[column] as HeaderView;
              const cellLabel = `${rowHeader.name} × ${columnHeader.name}`;
              if (mark) {
                const footballerName = session.footballerNames[mark.footballerId] ?? '';
                const color = SIDE_COLORS[mark.side];
                return (
                  <Animated.View
                    key={column}
                    entering={ZoomIn.springify().damping(14)}
                    accessible
                    accessibilityLabel={`${cellLabel}: ${footballerName}`}
                    style={[styles.cell, styles.claimed, { backgroundColor: color, shadowColor: color }]}>
                    <ThemedText
                      type="smallBold"
                      themeColor="onAccent"
                      style={styles.claimedLabel}
                      numberOfLines={3}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}>
                      {footballerName}
                    </ThemedText>
                  </Animated.View>
                );
              }
              return (
                <Pressable
                  key={column}
                  accessibilityRole="button"
                  accessibilityLabel={cellLabel}
                  accessibilityState={{ disabled }}
                  disabled={disabled}
                  onPress={() => {
                    haptics.select();
                    onSelectCell({ row, column });
                  }}
                  style={({ pressed }) => [styles.cell, styles.empty, pressed && styles.pressed, disabled && styles.disabled]}>
                  <ThemedText type="subtitle" themeColor="border">
                    +
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    width: '100%',
    maxWidth: 480,
    aspectRatio: 1,
    gap: Spacing.two,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.two,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.medium,
    padding: Spacing.one,
  },
  header: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerLabel: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 15,
    letterSpacing: 0.6,
  },
  flag: {
    fontSize: 18,
    lineHeight: 22,
  },
  empty: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressed: {
    backgroundColor: Colors.surfaceRaised,
    borderColor: Colors.floodlight,
  },
  disabled: {
    opacity: 0.55,
  },
  claimed: {
    shadowOpacity: 0.7,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  claimedLabel: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 15,
  },
});
