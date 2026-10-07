import { opponentOf, type Side } from '@sportapps/game-core';
import type { DuelRoundView, DuelView } from '@sportapps/protocol';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  Keyframe,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ActionButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Finishes, Fonts, MinimumTouchSize, Motion, Spacing, type ThemeColor } from '@/constants/theme';
import { FootballerCard, type CardEmphasis } from '@/features/match/footballer-card';
import type { PlayedFootballer } from '@/features/match/session';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

import { CardBack, EmptySlot } from './card-back';
import { METRIC_KEYS, metricValueText } from './labels';

const SIDES: readonly Side[] = ['x', 'o'];
const VERSUS = 'VS';
const POINT = '+1';
const LIFT = 10;
const VERSUS_HEIGHT = 34;
const VALUE_POP = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 1.7 }] },
  60: { opacity: 1, transform: [{ scale: 0.9 }] },
  100: { opacity: 1, transform: [{ scale: 1 }] },
})
  .duration(Motion.slow)
  .delay(Motion.slow);

interface DuelTableProps {
  view: DuelView;
  side: Side;
  cards: Readonly<Record<number, PlayedFootballer>>;
  canAct: boolean;
  arenaSize: number;
  handCardSize: number;
  onPlay: (footballerId: number) => void;
}

interface HandCardProps {
  footballer: PlayedFootballer | null;
  side: Side;
  size: number;
  selected: boolean;
  dimmed: boolean;
  disabled: boolean;
  onPress: () => void;
}

function HandCard({ footballer, side, size, selected, dimmed, disabled, onPress }: HandCardProps) {
  const lift = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -LIFT * lift.get() }, { scale: 1 + lift.get() * 0.06 }],
  }));

  useEffect(() => {
    lift.set(withSpring(selected ? 1 : 0, { damping: 12, stiffness: 240 }));
  }, [lift, selected]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={footballer?.name}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{ width: size, height: size }}>
      <Animated.View style={[dimmed && styles.handCardDimmed, style]}>
        <FootballerCard footballer={footballer} side={side} size={size} emphasis="none" />
      </Animated.View>
    </Pressable>
  );
}

function emphasisOf(round: DuelRoundView, side: Side): CardEmphasis {
  if (round.winner === null) {
    return 'none';
  }
  return round.winner === side ? 'winner' : 'dimmed';
}

export function DuelTable({ view, side, cards, canAct, arenaSize, handCardSize, onPlay }: DuelTableProps) {
  const { t, i18n } = useTranslation();
  const uppercase = useUppercase();
  const [selection, setSelection] = useState<{ round: number; footballerId: number } | null>(null);
  const rival = opponentOf(side);
  const roundIndex = view.rounds.length;
  const lastRound = view.rounds.at(-1) ?? null;
  const revealed = view.phase !== 'playing' ? lastRound : null;
  const playable = view.phase === 'playing' && view.played === null && canAct;
  const selected =
    playable && selection && selection.round === roundIndex && view.remaining.includes(selection.footballerId)
      ? selection.footballerId
      : null;

  const slot = (slotSide: Side) => {
    if (revealed) {
      return (
        <FootballerCard
          key={`${roundIndex}-${slotSide}`}
          footballer={cards[revealed.cards[slotSide]] ?? null}
          side={slotSide}
          size={arenaSize}
          emphasis={emphasisOf(revealed, slotSide)}
        />
      );
    }
    if (slotSide === side) {
      const shown = view.played ?? selected;
      return shown === null ? (
        <EmptySlot
          size={arenaSize}
          color={Finishes[side].base}
          waiting={view.phase === 'playing'}
          accessibilityLabel={t('duel.emptySlot')}
        />
      ) : (
        <View style={view.played === null && styles.preview}>
          <FootballerCard key={shown} footballer={cards[shown] ?? null} side={side} size={arenaSize} emphasis="none" />
        </View>
      );
    }
    return view.opponentPlayed ? (
      <CardBack size={arenaSize} finish={Finishes[rival]} accessibilityLabel={t('duel.hiddenCard')} />
    ) : (
      <EmptySlot
        size={arenaSize}
        color={Finishes[rival].base}
        waiting={view.phase === 'playing'}
        accessibilityLabel={t('duel.emptySlot')}
      />
    );
  };

  const status = (): { text: string; color: ThemeColor } => {
    if (revealed) {
      if (revealed.winner === null) {
        return { text: t('duel.roundDrawn'), color: 'gold' };
      }
      return revealed.winner === side
        ? { text: t('duel.roundWon'), color: 'positive' }
        : { text: t('duel.roundLost'), color: 'negative' };
    }
    if (view.played !== null) {
      return { text: t('duel.waitingOpponentCard'), color: 'textSecondary' };
    }
    return view.opponentPlayed
      ? { text: t('duel.opponentPlayed'), color: 'gold' }
      : { text: t('duel.pickCard'), color: 'volt' };
  };

  const current = status();

  return (
    <View style={styles.container}>
      <View style={styles.arena}>
        {SIDES.map((slotSide, index) => (
          <View key={slotSide} style={styles.arenaSide}>
            {index === 1 ? (
              <ThemedText style={[styles.versus, { marginTop: (arenaSize - VERSUS_HEIGHT) / 2 }]}>{VERSUS}</ThemedText>
            ) : null}
            <View style={styles.arenaColumn}>
              {slot(slotSide)}
              <View style={styles.value}>
                {revealed ? (
                  <Animated.View key={roundIndex} entering={VALUE_POP} style={styles.valueContent}>
                    <ThemedText
                      style={[styles.valueText, { color: Finishes[slotSide].base }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.6}>
                      {metricValueText(t, revealed.metric, revealed.values[slotSide], i18n.language)}
                      {revealed.winner === slotSide ? <ThemedText style={styles.point}>{`  ${POINT}`}</ThemedText> : null}
                    </ThemedText>
                    <ThemedText type="label" themeColor="textSecondary" style={styles.centered} numberOfLines={1}>
                      {uppercase(t(METRIC_KEYS[revealed.metric]))}
                    </ThemedText>
                  </Animated.View>
                ) : null}
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.status}>
        <ThemedText
          key={`${roundIndex}-${current.text}`}
          type="subtitle"
          themeColor={current.color}
          style={styles.centered}
          accessibilityLiveRegion="polite">
          {uppercase(current.text)}
        </ThemedText>
      </View>

      <Animated.View
        entering={FadeInDown.duration(Motion.slow).delay(160)}
        style={[styles.hand, view.phase === 'playing' && view.played !== null && styles.handWaiting]}>
        {view.remaining.map((footballerId) => (
          <HandCard
            key={footballerId}
            footballer={cards[footballerId] ?? null}
            side={side}
            size={handCardSize}
            selected={selected === footballerId}
            dimmed={selected !== null && selected !== footballerId}
            disabled={!playable}
            onPress={() => {
              haptics.select();
              setSelection({ round: roundIndex, footballerId });
            }}
          />
        ))}
      </Animated.View>

      <View style={styles.action}>
        {selected !== null ? <ActionButton label={t('duel.play')} onPress={() => onPlay(selected)} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'stretch',
    gap: Spacing.two,
  },
  status: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 32,
  },
  centered: {
    textAlign: 'center',
  },
  arena: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  arenaSide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  arenaColumn: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  versus: {
    width: 56,
    textAlign: 'center',
    fontFamily: Fonts.display,
    fontSize: 30,
    lineHeight: VERSUS_HEIGHT,
    color: Colors.textSecondary,
  },
  preview: {
    opacity: 0.55,
  },
  value: {
    alignSelf: 'stretch',
    height: 56,
    justifyContent: 'center',
  },
  valueContent: {
    alignItems: 'stretch',
  },
  valueText: {
    fontFamily: Fonts.display,
    fontSize: 32,
    lineHeight: 36,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  point: {
    fontFamily: Fonts.display,
    fontSize: 22,
    lineHeight: 36,
    color: Colors.positive,
  },
  hand: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  handWaiting: {
    opacity: 0.5,
  },
  handCardDimmed: {
    opacity: 0.5,
  },
  action: {
    minHeight: MinimumTouchSize + Spacing.two,
    justifyContent: 'center',
  },
});
