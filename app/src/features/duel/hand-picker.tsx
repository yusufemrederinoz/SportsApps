import type { Side } from '@sportapps/game-core';
import type { DuelConcept } from '@sportapps/protocol';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ActionButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Finishes, Fonts, Motion, Spacing } from '@/constants/theme';
import type { FootballerSummary } from '@/data/types';
import { FootballerCard } from '@/features/match/footballer-card';
import { FootballerSearch } from '@/features/match/footballer-search';
import type { PlayedFootballer } from '@/features/match/session';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

const ADD_MARK = '+';
const REMOVE_MARK = '×';
const BADGE_SIZE = 22;

interface HandPickerProps {
  title: string;
  marketCode: string;
  concept: DuelConcept;
  side: Side;
  handSize: number;
  cardSize: number;
  secondsLeft: number;
  canAct: boolean;
  onLock: (footballerIds: number[]) => void;
}

export function HandPicker({
  title,
  marketCode,
  concept,
  side,
  handSize,
  cardSize,
  secondsLeft,
  canAct,
  onLock,
}: HandPickerProps) {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const [picked, setPicked] = useState<FootballerSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const full = picked.length >= handSize;
  const pickedIds = picked.map((footballer) => footballer.id);
  const finish = Finishes[side];
  const expired = secondsLeft === 0;

  useEffect(() => {
    if (expired && canAct) {
      onLock(pickedIds);
    }
  });

  const add = (footballer: FootballerSummary) => {
    const next = [...picked, footballer].slice(0, handSize);
    setPicked(next);
    if (next.length >= handSize) {
      setSearching(false);
    }
  };

  const remove = (footballerId: number) => {
    haptics.select();
    setPicked(picked.filter((footballer) => footballer.id !== footballerId));
  };

  const slots = Array.from({ length: handSize }, (_, index) => picked[index] ?? null);

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(Motion.slow)}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
          {t('duel.pickHint')}
        </ThemedText>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(Motion.slow).delay(120)} style={styles.slots}>
        {slots.map((footballer, index) =>
          footballer ? (
            <Pressable
              key={footballer.id}
              accessibilityRole="button"
              accessibilityLabel={t('duel.removeCard', { name: footballer.name })}
              onPress={() => remove(footballer.id)}
              style={{ width: cardSize, height: cardSize }}>
              <FootballerCard footballer={footballer} side={side} size={cardSize} emphasis="none" />
              <View style={styles.badge} pointerEvents="none">
                <ThemedText style={styles.badgeText}>{REMOVE_MARK}</ThemedText>
              </View>
            </Pressable>
          ) : (
            <Pressable
              key={`empty-${index}`}
              accessibilityRole="button"
              accessibilityLabel={t('duel.addCard')}
              disabled={!canAct}
              onPress={() => {
                haptics.select();
                setSearching(true);
              }}
              style={({ pressed }) => [
                styles.empty,
                { width: cardSize, height: cardSize, borderRadius: cardSize * 0.12, borderColor: finish.base },
                pressed && styles.emptyPressed,
              ]}>
              <ThemedText style={[styles.add, { color: finish.base, fontSize: cardSize * 0.5, lineHeight: cardSize * 0.56 }]}>
                {ADD_MARK}
              </ThemedText>
            </Pressable>
          ),
        )}
      </Animated.View>

      <ThemedText type="label" themeColor={full ? 'volt' : 'textSecondary'} style={styles.centered} accessibilityLiveRegion="polite">
        {uppercase(t('duel.pickCount', { picked: picked.length, total: handSize }))}
      </ThemedText>

      <View style={styles.actions}>
        {full ? (
          <ActionButton label={t('duel.ready')} onPress={() => canAct && onLock(pickedIds)} />
        ) : (
          <>
            <ActionButton label={t('duel.addCard')} onPress={() => canAct && setSearching(true)} />
            <ActionButton label={t('duel.fill')} onPress={() => canAct && onLock(pickedIds)} variant="secondary" />
          </>
        )}
      </View>

      {searching && !full && canAct ? (
        <FootballerSearch
          title={title}
          market={marketCode}
          concept={concept}
          secondsLeft={secondsLeft}
          excludedIds={pickedIds}
          emptyLabel={t('duel.searchEmpty')}
          closeLabel={t('duel.searchDone', { picked: picked.length, total: handSize })}
          onSelect={add}
          onClose={() => setSearching(false)}
        />
      ) : null}
    </View>
  );
}

interface LockedHandProps {
  hand: readonly number[];
  cards: Readonly<Record<number, PlayedFootballer>>;
  side: Side;
  cardSize: number;
  opponentReady: boolean;
}

export function LockedHand({ hand, cards, side, cardSize, opponentReady }: LockedHandProps) {
  const { t } = useTranslation();
  const uppercase = useUppercase();

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle" themeColor="volt" style={styles.centered}>
        {uppercase(t('duel.locked'))}
      </ThemedText>
      <View style={styles.slots}>
        {hand.map((footballerId) => (
          <FootballerCard
            key={footballerId}
            footballer={cards[footballerId] ?? null}
            side={side}
            size={cardSize}
            emphasis="none"
          />
        ))}
      </View>
      <ThemedText type="label" themeColor="gold" style={styles.centered} accessibilityLiveRegion="polite">
        {uppercase(t(opponentReady ? 'duel.starting' : 'duel.waitingOpponentHand'))}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  centered: {
    textAlign: 'center',
  },
  slots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  empty: {
    alignItems: 'stretch',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(18, 24, 33, 0.6)',
  },
  emptyPressed: {
    backgroundColor: Colors.panelRaised,
  },
  add: {
    fontFamily: Fonts.heading,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    alignItems: 'stretch',
    justifyContent: 'center',
    backgroundColor: Colors.negative,
    borderWidth: 1.5,
    borderColor: Colors.ink,
  },
  badgeText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    lineHeight: 18,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  actions: {
    gap: Spacing.three,
  },
});
