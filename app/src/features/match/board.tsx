import { BOARD_SIZE, cellIndex, type CellPosition, type Side } from '@sportapps/game-core';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { GridView, HeaderView } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

import { flagEmoji } from './flags';
import type { MatchSession } from './session';

const INDEXES = Array.from({ length: BOARD_SIZE }, (_, index) => index);

interface BoardProps {
  gridView: GridView;
  session: MatchSession;
  disabled: boolean;
  onSelectCell: (position: CellPosition) => void;
}

function HeaderCell({ header }: { header: HeaderView }) {
  const theme = useTheme();
  const flag = flagEmoji(header.countryCode);
  return (
    <View style={[styles.cell, { backgroundColor: theme.backgroundSelected }]}>
      {flag ? <ThemedText style={styles.flag}>{flag}</ThemedText> : null}
      <ThemedText type="smallBold" style={styles.label} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.7}>
        {header.name}
      </ThemedText>
    </View>
  );
}

export function Board({ gridView, session, disabled, onSelectCell }: BoardProps) {
  const theme = useTheme();
  const sideColor = (side: Side) => (side === 'x' ? theme.sideX : theme.sideO);

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
              if (mark) {
                return (
                  <View key={column} style={[styles.cell, { backgroundColor: sideColor(mark.side) }]}>
                    <ThemedText
                      type="smallBold"
                      style={[styles.label, { color: theme.onAccent }]}
                      numberOfLines={3}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}>
                      {session.footballerNames[mark.footballerId] ?? ''}
                    </ThemedText>
                  </View>
                );
              }
              return (
                <Pressable
                  key={column}
                  accessibilityRole="button"
                  accessibilityLabel={`${rowHeader.name} × ${columnHeader.name}`}
                  disabled={disabled}
                  onPress={() => onSelectCell({ row, column })}
                  style={({ pressed }) => [
                    styles.cell,
                    { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
                  ]}
                />
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
    gap: Spacing.one,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.one,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    padding: Spacing.one,
  },
  label: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 15,
  },
  flag: {
    fontSize: 18,
    lineHeight: 22,
  },
});
