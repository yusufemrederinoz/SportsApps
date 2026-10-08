import type { PlayerProgress } from '@sportapps/protocol';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { GoalIcon } from '@/components/goal-icon';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MinimumTouchSize, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

const BAR_WIDTH = 56;
const ADD_SIZE = 18;

export function levelProgress(progress: PlayerProgress): number {
  const { floor, next } = progress.level;
  return Math.min(1, Math.max(0, (progress.total - floor) / Math.max(1, next - floor)));
}

interface ProgressChipProps {
  progress: PlayerProgress;
  onPress: () => void;
  onGoalsPress: () => void;
}

export function ProgressChip({ progress, onPress, onGoalsPress }: ProgressChipProps) {
  const { t, i18n } = useTranslation();
  const uppercase = useUppercase();
  const fill = levelProgress(progress);

  return (
    <View style={styles.chip}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('progress.open', {
          level: progress.level.level,
          points: progress.total.toLocaleString(i18n.language),
        })}
        onPress={() => {
          haptics.select();
          onPress();
        }}
        style={({ pressed }) => [styles.part, styles.level, pressed && styles.pressed]}>
        <View style={styles.levelBadge}>
          <ThemedText style={styles.levelText}>{uppercase(t('progress.levelShort', { level: progress.level.level }))}</ThemedText>
        </View>
        <View style={styles.levelInfo}>
          <ThemedText type="label" style={styles.points}>
            {progress.total.toLocaleString(i18n.language)}
          </ThemedText>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: BAR_WIDTH * fill }]} />
          </View>
        </View>
      </Pressable>
      <View style={styles.divider} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('progress.openStore', { goals: progress.goals })}
        onPress={() => {
          haptics.select();
          onGoalsPress();
        }}
        style={({ pressed }) => [styles.part, styles.wallet, pressed && styles.pressed]}>
        <GoalIcon size={20} />
        <ThemedText style={styles.goals}>{progress.goals.toLocaleString(i18n.language)}</ThemedText>
        <View style={styles.add}>
          <ThemedText style={styles.addText}>+</ThemedText>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: MinimumTouchSize,
    borderRadius: Radius.large,
    borderWidth: 1.5,
    borderColor: Colors.strokeBright,
    backgroundColor: Colors.panel,
    overflow: 'hidden',
  },
  part: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  level: {
    paddingLeft: Spacing.one,
    paddingRight: Spacing.two,
  },
  wallet: {
    minWidth: MinimumTouchSize,
    paddingLeft: Spacing.two,
    paddingRight: Spacing.two,
  },
  pressed: {
    backgroundColor: Colors.panelRaised,
  },
  levelBadge: {
    minWidth: 40,
    height: 38,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: Colors.volt,
  },
  levelText: {
    fontFamily: Fonts.display,
    fontSize: 18,
    lineHeight: 20,
    color: Colors.onAccent,
  },
  levelInfo: {
    gap: Spacing.half,
  },
  points: {
    color: Colors.text,
  },
  bar: {
    width: BAR_WIDTH,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.stroke,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.volt,
  },
  divider: {
    width: 1,
    marginVertical: Spacing.two,
    backgroundColor: Colors.stroke,
  },
  goals: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    lineHeight: 22,
    color: Colors.gold,
  },
  add: {
    width: ADD_SIZE,
    height: ADD_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ADD_SIZE / 2,
    backgroundColor: Colors.gold,
  },
  addText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    lineHeight: 16,
    color: Colors.onAccent,
  },
});
