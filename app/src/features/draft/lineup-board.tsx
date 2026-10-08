import type { Side } from '@sportapps/game-core';
import type { DraftSlotView } from '@sportapps/protocol';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { Keyframe } from 'react-native-reanimated';

import { portraitUrl } from '@/api';
import { MetalPlate } from '@/components/metal-plate';
import { ThemedText } from '@/components/themed-text';
import { Colors, Finishes, Fonts, Motion, Spacing } from '@/constants/theme';
import type { PlayedFootballer } from '@/features/match/session';
import { useUppercase } from '@/i18n/uppercase';

const ROLE_KEYS = { GK: 'role.GK', DF: 'role.DF', MF: 'role.MF', FW: 'role.FW' } as const;
const ROWS: readonly DraftSlotView['position'][] = ['FW', 'MF', 'DF', 'GK'];
const ARRIVAL = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 2.2 }] },
  60: { opacity: 1, transform: [{ scale: 0.92 }] },
  100: { opacity: 1, transform: [{ scale: 1 }] },
}).duration(Motion.slow);

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}

const PARTICLES = new Set(['de', 'da', 'di', 'do', 'dos', 'das', 'du', 'del', 'della', 'van', 'von', 'der', 'den', 'le', 'la', 'el', 'al', 'ter', 'ten']);

export function shortName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  let start = parts.length - 1;
  while (start > 0 && PARTICLES.has((parts[start - 1] ?? '').toLowerCase())) {
    start -= 1;
  }
  return parts.slice(Math.max(0, start)).join(' ') || name;
}

interface SlotProps {
  slot: DraftSlotView;
  footballer: PlayedFootballer | null;
  side: Side;
  size: number;
}

function Slot({ slot, footballer, side, size }: SlotProps) {
  const { t } = useTranslation();
  const finish = Finishes[side];
  const role = t(ROLE_KEYS[slot.position]);
  const filled = slot.footballerId !== null && footballer !== null;
  const portrait = filled && footballer.hasPortrait ? portraitUrl(footballer.id) : null;
  const label = filled
    ? t('draft.slotLabel', { position: role, name: footballer.name, value: slot.value ?? 0 })
    : t('draft.emptySlot', { position: role });

  return (
    <View style={[styles.slot, { width: size + Spacing.three }]} accessible accessibilityLabel={label}>
      {filled ? (
        <Animated.View
          key={slot.footballerId}
          entering={ARRIVAL}
          style={[styles.badge, { width: size, height: size, borderRadius: size * 0.22, borderColor: finish.light, backgroundColor: finish.deep }]}>
          {portrait ? (
            <Image
              source={{ uri: portrait }}
              style={{ position: 'absolute', width: size, height: size, left: -1.5, top: 0 }}
              contentFit="contain"
              cachePolicy="disk"
              accessible={false}
            />
          ) : (
            <ThemedText style={[styles.initials, { color: finish.light, fontSize: size * 0.38, lineHeight: size * 0.44 }]}>
              {initials(footballer.name)}
            </ThemedText>
          )}
        </Animated.View>
      ) : (
        <View style={[styles.empty, { width: size, height: size, borderRadius: size * 0.22, borderColor: finish.base }]}>
          <ThemedText style={[styles.role, { color: finish.base, fontSize: size * 0.3, lineHeight: size * 0.36 }]}>{role}</ThemedText>
        </View>
      )}
      <ThemedText style={styles.name} numberOfLines={1}>
        {filled ? shortName(footballer.name) : ' '}
      </ThemedText>
      <ThemedText style={[styles.value, { color: finish.base }]} numberOfLines={1}>
        {filled ? String(slot.value ?? 0) : ' '}
      </ThemedText>
    </View>
  );
}

interface LineupBoardProps {
  side: Side;
  name: string;
  lineup: readonly DraftSlotView[];
  cards: Readonly<Record<number, PlayedFootballer>>;
  slotSize: number;
  active: boolean;
}

export function LineupBoard({ side, name, lineup, cards, slotSize, active }: LineupBoardProps) {
  const uppercase = useUppercase();
  const finish = Finishes[side];

  return (
    <MetalPlate finish={null} radius={14} style={[styles.board, active && { borderColor: finish.base }]}>
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: finish.base }]} />
        <ThemedText style={[styles.title, { color: finish.base }]} numberOfLines={1}>
          {uppercase(name)}
        </ThemedText>
      </View>
      {ROWS.map((position) => (
        <View key={position} style={styles.row}>
          {lineup
            .filter((slot) => slot.position === position)
            .map((slot, index) => (
              <Slot
                key={`${position}-${index}`}
                slot={slot}
                footballer={slot.footballerId === null ? null : (cards[slot.footballerId] ?? null)}
                side={side}
                size={slotSize}
              />
            ))}
        </View>
      ))}
    </MetalPlate>
  );
}

const styles = StyleSheet.create({
  board: {
    flex: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    gap: Spacing.one,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    flex: 1,
    fontFamily: Fonts.heading,
    fontSize: 16,
    lineHeight: 18,
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  slot: {
    alignItems: 'center',
  },
  badge: {
    overflow: 'hidden',
    alignItems: 'stretch',
    justifyContent: 'center',
    borderWidth: 2,
  },
  empty: {
    alignItems: 'stretch',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(18, 24, 33, 0.6)',
  },
  initials: {
    fontFamily: Fonts.display,
    textAlign: 'center',
  },
  role: {
    fontFamily: Fonts.display,
    textAlign: 'center',
  },
  name: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.text,
  },
  value: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontFamily: Fonts.display,
    fontSize: 15,
    lineHeight: 17,
    fontVariant: ['tabular-nums'],
  },
});
