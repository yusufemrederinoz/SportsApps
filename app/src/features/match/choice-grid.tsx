import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors, MinimumTouchSize, Motion, Radius, Spacing } from '@/constants/theme';
import type { PlayedFootballer } from '@/features/match/session';
import { haptics } from '@/feedback/haptics';

const STAGGER = 40;

interface ChoiceGridProps {
  choices: readonly number[];
  cards: Readonly<Record<number, PlayedFootballer>>;
  disabled: boolean;
  onPick: (footballerId: number) => void;
}

export function ChoiceGrid({ choices, cards, disabled, onPick }: ChoiceGridProps) {
  return (
    <View style={styles.grid}>
      {choices.map((footballerId, index) => {
        const card = cards[footballerId] ?? null;
        return (
          <Animated.View key={footballerId} entering={FadeInDown.delay(index * STAGGER).duration(Motion.base)} style={styles.cell}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={card?.name ?? '?'}
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={() => {
                haptics.select();
                onPick(footballerId);
              }}
              style={({ pressed }) => [styles.choice, pressed && styles.pressed, disabled && styles.disabled]}>
              <ThemedText type="smallBold" numberOfLines={2} style={styles.name}>
                {card?.name ?? '…'}
              </ThemedText>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  cell: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  choice: {
    minHeight: MinimumTouchSize + Spacing.one,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.small,
    borderWidth: 1.5,
    borderColor: Colors.volt,
    backgroundColor: Colors.panelRaised,
  },
  pressed: {
    backgroundColor: 'rgba(200, 255, 46, 0.16)',
  },
  disabled: {
    opacity: 0.5,
  },
  name: {
    flex: 1,
  },
});
