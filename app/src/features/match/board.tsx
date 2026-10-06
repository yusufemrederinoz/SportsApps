import { BOARD_SIZE, cellIndex, findWinningLine, type CellPosition } from '@sportapps/game-core';
import { Canvas, LinearGradient, RoundedRect, vec } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors, Finishes, Fonts, Radius } from '@/constants/theme';
import type { GridView, HeaderView } from '@/data/types';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

import { ClaimBurst } from './claim-burst';
import { flagEmoji } from './flags';
import { FootballerCard, type CardEmphasis } from './footballer-card';
import type { MatchSession } from './session';

const GAP = 6;
const TRACKS = BOARD_SIZE + 1;
const INDEXES = Array.from({ length: BOARD_SIZE }, (_, index) => index);
const SHAKE_STEPS = [-11, 10, -7, 6, -3, 0];
const BRAND_DOTS = [Finishes.x.base, Colors.volt, Finishes.o.base];

interface BoardProps {
  gridView: GridView;
  session: MatchSession;
  disabled: boolean;
  selected: CellPosition | null;
  onSelectCell: (position: CellPosition) => void;
}

export function Board({ gridView, session, disabled, selected, onSelectCell }: BoardProps) {
  const uppercase = useUppercase();
  const [boardSize, setBoardSize] = useState(0);
  const pulse = useSharedValue(0);
  const shake = useSharedValue(0);
  const invitation = useDerivedValue(() => 0.25 + pulse.get() * 0.6);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));
  const { match, feedback, lastClaim } = session;
  const missed = feedback?.kind === 'wrong' || feedback?.kind === 'already-used';

  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [pulse]);

  useEffect(() => {
    if (missed) {
      shake.set(withSequence(...SHAKE_STEPS.map((offset) => withTiming(offset, { duration: 55 }))));
    }
  }, [missed, feedback, shake]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setBoardSize((current) => (current === width ? current : width));
  };

  const cell = (boardSize - GAP * BOARD_SIZE) / TRACKS;
  const offset = (track: number) => track * (cell + GAP);
  const winningLine = findWinningLine(match);
  const finished = match.result !== null;

  const emphasisOf = (index: number): CardEmphasis => {
    if (!finished) {
      return 'none';
    }
    if (!winningLine) {
      return 'none';
    }
    return winningLine.includes(index) ? 'winner' : 'dimmed';
  };

  const headerLabel = (header: HeaderView) => (
    <View style={styles.headerContent} accessible accessibilityLabel={header.name}>
      {flagEmoji(header.countryCode) ? (
        <ThemedText style={styles.flag}>{flagEmoji(header.countryCode)}</ThemedText>
      ) : null}
      <ThemedText style={styles.headerLabel} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.65}>
        {uppercase(header.name)}
      </ThemedText>
    </View>
  );

  return (
    <Animated.View style={[styles.board, shakeStyle]} onLayout={onLayout}>
      {boardSize > 0 ? (
        <>
          <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
            {BRAND_DOTS.map((color, index) => (
              <RoundedRect
                key={color}
                x={cell * 0.2 + index * cell * 0.22}
                y={cell * 0.42}
                width={cell * 0.16}
                height={cell * 0.16}
                r={3}
                color={color}
              />
            ))}
            {INDEXES.map((index) => {
              const track = index + 1;
              return [
                <RoundedRect key={`c${index}`} x={offset(track)} y={0} width={cell} height={cell} r={Radius.medium}>
                  <LinearGradient start={vec(0, 0)} end={vec(0, cell)} colors={[Colors.panelRaised, Colors.panel]} />
                </RoundedRect>,
                <RoundedRect
                  key={`cs${index}`}
                  x={offset(track)}
                  y={0}
                  width={cell}
                  height={cell}
                  r={Radius.medium}
                  color={Colors.strokeBright}
                  style="stroke"
                  strokeWidth={1}
                  opacity={0.6}
                />,
                <RoundedRect
                  key={`ca${index}`}
                  x={offset(track) + cell * 0.34}
                  y={cell - 4}
                  width={cell * 0.32}
                  height={3}
                  r={1.5}
                  color={Colors.volt}
                />,
                <RoundedRect key={`r${index}`} x={0} y={offset(track)} width={cell} height={cell} r={Radius.medium}>
                  <LinearGradient start={vec(0, 0)} end={vec(cell, 0)} colors={[Colors.panelRaised, Colors.panel]} />
                </RoundedRect>,
                <RoundedRect
                  key={`rs${index}`}
                  x={0}
                  y={offset(track)}
                  width={cell}
                  height={cell}
                  r={Radius.medium}
                  color={Colors.strokeBright}
                  style="stroke"
                  strokeWidth={1}
                  opacity={0.6}
                />,
                <RoundedRect
                  key={`ra${index}`}
                  x={cell - 4}
                  y={offset(track) + cell * 0.34}
                  width={3}
                  height={cell * 0.32}
                  r={1.5}
                  color={Colors.volt}
                />,
              ];
            })}
            {INDEXES.flatMap((row) =>
              INDEXES.map((column) => {
                const index = cellIndex({ row, column });
                if (match.cells[index]) {
                  return null;
                }
                const isSelected = selected?.row === row && selected.column === column;
                const x = offset(column + 1);
                const y = offset(row + 1);
                return [
                  <RoundedRect key={`s${index}`} x={x} y={y} width={cell} height={cell} r={Radius.medium}>
                    <LinearGradient start={vec(x, y)} end={vec(x, y + cell)} colors={[Colors.ink, Colors.panel]} />
                  </RoundedRect>,
                  <RoundedRect
                    key={`so${index}`}
                    x={x + 1}
                    y={y + 1}
                    width={cell - 2}
                    height={cell - 2}
                    r={Radius.medium}
                    color={isSelected || !disabled ? Colors.volt : Colors.stroke}
                    style="stroke"
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    opacity={isSelected ? 1 : disabled ? 0.9 : invitation}
                  />,
                ];
              }),
            )}
          </Canvas>

          <View style={styles.tracks} pointerEvents="box-none">
            <View style={styles.row} pointerEvents="box-none">
              <View style={styles.track} />
              {gridView.columns.map((header) => (
                <View key={`${header.kind}-${header.referenceId}`} style={styles.track}>
                  {headerLabel(header)}
                </View>
              ))}
            </View>
            {INDEXES.map((row) => {
              const rowHeader = gridView.rows[row] as HeaderView;
              return (
                <View key={row} style={styles.row} pointerEvents="box-none">
                  <View style={styles.track}>{headerLabel(rowHeader)}</View>
                  {INDEXES.map((column) => {
                    const index = cellIndex({ row, column });
                    const mark = match.cells[index] ?? null;
                    const columnHeader = gridView.columns[column] as HeaderView;
                    const cellLabel = `${rowHeader.name} × ${columnHeader.name}`;
                    if (mark) {
                      const footballer = session.footballers[mark.footballerId] ?? null;
                      return (
                        <View
                          key={column}
                          style={styles.track}
                          accessible
                          accessibilityLabel={`${cellLabel}: ${footballer?.name ?? ''}`}>
                          <FootballerCard footballer={footballer} side={mark.side} size={cell} emphasis={emphasisOf(index)} />
                        </View>
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
                        style={({ pressed }) => [styles.track, styles.slot, pressed && styles.slotPressed]}>
                        <ThemedText style={[styles.plus, disabled && styles.plusDisabled]}>+</ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
          </View>

          {lastClaim ? (
            <ClaimBurst
              key={lastClaim.turnNumber}
              x={offset((lastClaim.index % BOARD_SIZE) + 1) + cell / 2}
              y={offset(Math.floor(lastClaim.index / BOARD_SIZE) + 1) + cell / 2}
              size={cell}
              color={Finishes[lastClaim.side].light}
            />
          ) : null}
        </>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  board: {
    width: '100%',
    maxWidth: 480,
    aspectRatio: 1,
  },
  tracks: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    gap: GAP,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: GAP,
  },
  track: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  headerLabel: {
    fontFamily: Fonts.heading,
    color: Colors.text,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 15,
    letterSpacing: 0.5,
  },
  flag: {
    fontSize: 18,
    lineHeight: 22,
  },
  slot: {
    borderRadius: Radius.medium,
  },
  slotPressed: {
    backgroundColor: 'rgba(200, 255, 46, 0.16)',
  },
  plus: {
    fontFamily: Fonts.label,
    fontSize: 30,
    lineHeight: 32,
    color: Colors.volt,
    opacity: 0.8,
  },
  plusDisabled: {
    color: Colors.strokeBright,
    opacity: 0.5,
  },
});
