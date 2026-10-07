import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import Animated, { FadeOut, Keyframe } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Motion, type ThemeColor } from '@/constants/theme';
import { useNameUppercase, useUppercase } from '@/i18n/uppercase';

import type { Feedback } from './session';

const STAMP_KEYS = {
  correct: 'match.stampCorrect',
  wrong: 'match.stampWrong',
  'already-used': 'match.stampAlreadyUsed',
  timeout: 'match.stampTimeout',
  'bot-passed': 'match.stampBotPassed',
} as const satisfies Record<Feedback['kind'], string>;

const STAMP_COLORS: Record<Feedback['kind'], ThemeColor> = {
  correct: 'positive',
  wrong: 'negative',
  'already-used': 'negative',
  timeout: 'gold',
  'bot-passed': 'gold',
};

const SLAM = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 2.2 }, { rotate: '-9deg' }] },
  45: { opacity: 1, transform: [{ scale: 0.9 }, { rotate: '-4deg' }] },
  70: { opacity: 1, transform: [{ scale: 1.08 }, { rotate: '-4deg' }] },
  100: { opacity: 1, transform: [{ scale: 1 }, { rotate: '-4deg' }] },
}).duration(Motion.slow);

export function FeedbackStamp({ feedback, homeCountryCode }: { feedback: Feedback; homeCountryCode: string }) {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const nameUppercase = useNameUppercase();
  const color = Colors[STAMP_COLORS[feedback.kind]];

  return (
    <Animated.View
      entering={SLAM}
      exiting={FadeOut.duration(Motion.quick)}
      accessibilityLiveRegion="assertive"
      style={styles.container}>
      <ThemedText style={[styles.stamp, { color, textShadowColor: color }]}>{uppercase(t(STAMP_KEYS[feedback.kind]))}</ThemedText>
      {feedback.footballerName ? (
        <ThemedText type="label" themeColor="textSecondary" numberOfLines={1}>
          {nameUppercase(feedback.footballerName, feedback.footballerCountryCode === homeCountryCode)}
        </ThemedText>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  stamp: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontFamily: Fonts.display,
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: 1,
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 0 },
  },
});
