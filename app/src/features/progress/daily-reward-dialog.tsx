import { DAILY_GOALS, type DailyReward } from '@sportapps/protocol';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, Keyframe } from 'react-native-reanimated';

import { ActionButton } from '@/components/action-button';
import { GoalIcon } from '@/components/goal-icon';
import { MetalPlate } from '@/components/metal-plate';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MaxContentWidth, Motion, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/feedback/haptics';
import { playSound } from '@/feedback/sounds';
import { useUppercase } from '@/i18n/uppercase';

const BALL_SIZE = 96;
const BALL_SPIN = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.2 }, { rotate: '-240deg' }] },
  65: { opacity: 1, transform: [{ scale: 1.15 }, { rotate: '12deg' }] },
  100: { opacity: 1, transform: [{ scale: 1 }, { rotate: '0deg' }] },
}).duration(Motion.cinematic);

export function DailyRewardDialog({ reward, onClose }: { reward: DailyReward; onClose: () => void }) {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const reached = Math.min(reward.streak, DAILY_GOALS.length);

  useEffect(() => {
    haptics.success();
    playSound('win');
  }, []);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(Motion.base)} style={styles.backdrop}>
        <Animated.View entering={FadeInDown.duration(Motion.slow)} style={styles.panel} accessibilityViewIsModal>
          <MetalPlate finish={null} cut="right" cutSize={22} radius={16} style={styles.plate}>
            <ThemedText type="label" themeColor="volt" style={styles.centered} accessibilityRole="header">
              {uppercase(t('daily.title'))}
            </ThemedText>
            <Animated.View entering={BALL_SPIN} style={styles.ball}>
              <GoalIcon size={BALL_SIZE} />
            </Animated.View>
            <View style={styles.amount} accessible accessibilityLabel={t('progress.goals', { goals: reward.goals })}>
              <ThemedText style={styles.amountText}>{`+${reward.goals}`}</ThemedText>
              <ThemedText type="label" themeColor="textSecondary">
                {uppercase(t('daily.streak', { streak: reward.streak }))}
              </ThemedText>
            </View>
            {reward.welcomeGoals ? (
              <Animated.View entering={FadeInDown.duration(Motion.slow).delay(Motion.slow)} style={styles.welcome} accessible>
                <View style={styles.welcomeRow}>
                  <GoalIcon size={20} />
                  <ThemedText style={styles.welcomeText}>{t('daily.welcome', { goals: reward.welcomeGoals })}</ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
                  {t('daily.welcomeHint')}
                </ThemedText>
              </Animated.View>
            ) : null}
            <View style={styles.days}>
              {DAILY_GOALS.map((goals, index) => {
                const day = index + 1;
                const done = day <= reached;
                return (
                  <View
                    key={day}
                    accessible
                    accessibilityLabel={t('daily.day', { day, goals })}
                    style={[styles.day, done && styles.dayDone, day === reached && styles.dayToday]}>
                    <ThemedText style={[styles.dayGoals, done && styles.dayGoalsDone, day === reached && styles.dayGoalsToday]}>
                      {goals}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
              {t('daily.hint')}
            </ThemedText>
            <ActionButton label={t('daily.collect')} onPress={onClose} />
          </MetalPlate>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    backgroundColor: 'rgba(5, 7, 10, 0.86)',
  },
  panel: {
    alignSelf: 'stretch',
    maxWidth: MaxContentWidth,
  },
  plate: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  centered: {
    textAlign: 'center',
  },
  ball: {
    alignSelf: 'center',
  },
  amount: {
    alignItems: 'center',
  },
  amountText: {
    fontFamily: Fonts.display,
    fontSize: 64,
    lineHeight: 64,
    color: Colors.gold,
    textShadowColor: Colors.gold,
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
  welcome: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    backgroundColor: Colors.ink,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  welcomeText: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    lineHeight: 22,
    color: Colors.gold,
  },
  days: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  day: {
    flex: 1,
    maxWidth: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
    borderWidth: 1.5,
    borderColor: Colors.stroke,
    backgroundColor: Colors.ink,
  },
  dayDone: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(243, 198, 83, 0.18)',
  },
  dayToday: {
    backgroundColor: Colors.gold,
  },
  dayGoals: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  dayGoalsDone: {
    color: Colors.text,
  },
  dayGoalsToday: {
    color: Colors.onAccent,
  },
});
