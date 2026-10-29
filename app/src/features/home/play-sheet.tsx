import type { GameId } from '@sportapps/protocol';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ModeCard } from '@/components/mode-card';
import { ThemedText } from '@/components/themed-text';
import { AccentFinishes, Colors, Finishes, Fonts, MaxContentWidth, MinimumTouchSize, Motion, Radius, Spacing } from '@/constants/theme';
import type { Difficulty } from '@/data/types';
import { GAME_LABELS } from '@/features/games';
import { DIFFICULTIES, DIFFICULTY_LABELS } from '@/features/match/difficulty';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

interface PlaySheetProps {
  game: GameId;
  difficulty: Difficulty;
  onDifficulty: (difficulty: Difficulty) => void;
  onOnline: () => void;
  onFriend: () => void;
  onBot: () => void;
  onClose: () => void;
}

export function PlaySheet({ game, difficulty, onDifficulty, onOnline, onFriend, onBot, onClose }: PlaySheetProps) {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [onClose]);

  return (
    <Animated.View entering={FadeIn.duration(Motion.base)} exiting={FadeOut.duration(Motion.base)} style={styles.backdrop}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('home.close')} onPress={onClose} style={StyleSheet.absoluteFill} />
      <Animated.View
        entering={SlideInDown.duration(Motion.slow).easing(Easing.out(Easing.cubic))}
        exiting={SlideOutDown.duration(Motion.base).easing(Easing.in(Easing.cubic))}
        accessibilityViewIsModal
        style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.four }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <ThemedText
            type="title"
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={styles.title}>
            {uppercase(t(GAME_LABELS[game]))}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('home.close')}
            onPress={onClose}
            style={({ pressed }) => [styles.close, pressed && styles.closePressed]}>
            <ThemedText style={styles.closeMark}>×</ThemedText>
          </Pressable>
        </View>
        <View style={styles.section}>
          <ThemedText type="label" themeColor="textSecondary">
            {uppercase(t('home.difficulty'))}
          </ThemedText>
          <View style={styles.difficultyRow} accessibilityRole="radiogroup">
            {DIFFICULTIES.map((option) => {
              const selected = option === difficulty;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    haptics.select();
                    onDifficulty(option);
                  }}
                  style={[styles.difficultyOption, selected && styles.difficultySelected]}>
                  <ThemedText
                    style={[
                      styles.difficultyLabel,
                      {
                        color: selected ? Colors.onAccent : Colors.textSecondary,
                      },
                    ]}>
                    {uppercase(t(DIFFICULTY_LABELS[option]))}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.section}>
          <ThemedText type="label" themeColor="textSecondary">
            {uppercase(t('home.matchType'))}
          </ThemedText>
          <ModeCard
            compact
            title={t('home.modeOnlineTitle')}
            hint={t('home.modeOnlineHint')}
            finish={AccentFinishes.volt}
            onPress={onOnline}
          />
          <ModeCard
            compact
            title={t('home.modeFriendTitle')}
            hint={t('home.modeFriendHint')}
            finish={AccentFinishes.steel}
            onPress={onFriend}
          />
          <ModeCard compact title={t('home.modeBotTitle')} hint={t('home.modeBotHint')} finish={Finishes.x} onPress={onBot} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 7, 10, 0.78)',
  },
  sheet: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderTopLeftRadius: Radius.large + 8,
    borderTopRightRadius: Radius.large + 8,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.stroke,
    backgroundColor: Colors.panel,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.strokeBright,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  title: {
    flex: 1,
  },
  close: {
    width: MinimumTouchSize,
    height: MinimumTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: MinimumTouchSize / 2,
    borderWidth: 1.5,
    borderColor: Colors.stroke,
    backgroundColor: Colors.panelRaised,
  },
  closePressed: {
    borderColor: Colors.volt,
  },
  closeMark: {
    fontFamily: Fonts.heading,
    fontSize: 30,
    lineHeight: 32,
    color: Colors.text,
  },
  section: {
    gap: Spacing.two,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  difficultyOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MinimumTouchSize,
    borderRadius: Radius.medium,
    borderWidth: 1.5,
    borderColor: Colors.stroke,
    backgroundColor: Colors.background,
  },
  difficultySelected: {
    borderColor: Colors.volt,
    backgroundColor: Colors.volt,
  },
  difficultyLabel: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    lineHeight: 20,
    letterSpacing: 1,
  },
});
