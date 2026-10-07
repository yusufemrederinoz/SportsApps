import type { PlayerProgress } from '@sportapps/protocol';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { GoalIcon } from '@/components/goal-icon';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MinimumTouchSize, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

const BAR_WIDTH = 56;

export function levelProgress(progress: PlayerProgress): number {
  const { floor, next } = progress.level;
  return Math.min(1, Math.max(0, (progress.total - floor) / Math.max(1, next - floor)));
}

export function ProgressChip({ progress, onPress }: { progress: PlayerProgress; onPress: () => void }) {
  const { t, i18n } = useTranslation();
  const uppercase = useUppercase();
  const fill = levelProgress(progress);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('progress.open', {
        level: progress.level.level,
        points: progress.total.toLocaleString(i18n.language),
        goals: progress.goals,
      })}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
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
      <View style={styles.divider} />
      <GoalIcon size={20} />
      <ThemedText style={styles.goals}>{progress.goals.toLocaleString(i18n.language)}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: MinimumTouchSize,
    paddingLeft: Spacing.one,
    paddingRight: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1.5,
    borderColor: Colors.strokeBright,
    backgroundColor: Colors.panel,
  },
  pressed: {
    borderColor: Colors.volt,
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
    alignSelf: 'stretch',
    marginVertical: Spacing.two,
    backgroundColor: Colors.stroke,
  },
  goals: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    lineHeight: 22,
    color: Colors.gold,
  },
});
