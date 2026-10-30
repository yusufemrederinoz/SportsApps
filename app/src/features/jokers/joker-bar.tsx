import {
  EXTRA_TIME_SECONDS,
  GAME_JOKERS,
  JOKERS_PER_MATCH,
  JOKER_PRICE,
  type DuelMetric,
  type JokerId,
  type JokerReveal,
  type JokerTarget,
  type PlayErrorCode,
} from '@sportapps/protocol';
import { use, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { GoalIcon } from '@/components/goal-icon';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Motion, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/feedback/haptics';
import { URGENT_SECONDS } from '@/features/match/use-match-effects';
import { useUppercase } from '@/i18n/uppercase';

import { JokerContext } from './joker-context';
import { useRevealText } from './reveal-text';

const VISIBLE_REVEALS = 2;
const PULSE_MILLISECONDS = 360;

function errorKey(error: PlayErrorCode) {
  if (error === 'joker-limit') {
    return 'jokers.errorLimit';
  }
  return error === 'not-enough-goals' ? 'jokers.errorGoals' : 'jokers.errorUnavailable';
}

const LABEL_KEYS = {
  'extra-time': 'jokers.extra-time',
  hint: 'jokers.hint',
  'swap-card': 'jokers.swap-card',
  'see-values': 'jokers.see-values',
  'show-assists': 'jokers.show-assists',
  pass: 'jokers.pass',
  'reveal-value': 'jokers.reveal-value',
  'club-hint': 'jokers.club-hint',
  'answer-count': 'jokers.answer-count',
  'extra-life': 'jokers.extra-life',
  'first-letter': 'jokers.first-letter',
  nationality: 'jokers.nationality',
  position: 'jokers.position',
} as const satisfies Record<JokerId, string>;

export function jokerLabelKey(joker: JokerId) {
  return LABEL_KEYS[joker];
}

function RevealLine({ reveal, market, metric }: { reveal: JokerReveal; market: string; metric: DuelMetric | null }) {
  const text = useRevealText(reveal, market, metric);
  return text ? (
    <Animated.View entering={FadeInDown.duration(Motion.base)}>
      <ThemedText type="smallBold" themeColor="volt" accessibilityLiveRegion="polite">
        {text}
      </ThemedText>
    </Animated.View>
  ) : null;
}

function HurryButton({ seconds, pending, onPress }: { seconds: number; pending: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }));

  useEffect(() => {
    if (reducedMotion) {
      return;
    }
    pulse.set(
      withRepeat(withSequence(withTiming(1.05, { duration: PULSE_MILLISECONDS }), withTiming(1, { duration: PULSE_MILLISECONDS })), -1),
    );
  }, [pulse, reducedMotion]);

  return (
    <Animated.View entering={ZoomIn.duration(Motion.base)} style={pulseStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('jokers.use', { name: t('jokers.extra-time'), price: JOKER_PRICE })}
        accessibilityState={{ busy: pending }}
        disabled={pending}
        onPress={() => {
          haptics.select();
          onPress();
        }}
        style={({ pressed }) => [styles.hurry, pressed && styles.hurryPressed]}>
        <View style={styles.hurryText}>
          <ThemedText style={styles.hurryLabel}>{uppercase(t('jokers.hurry'))}</ThemedText>
          <ThemedText style={styles.hurryTime}>{uppercase(t('jokers.addTime', { seconds }))}</ThemedText>
        </View>
        <View style={styles.hurryPrice}>
          <GoalIcon size={20} />
          <ThemedText style={styles.hurryPriceText}>{JOKER_PRICE}</ThemedText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

interface JokerBarProps {
  scope: string | number;
  available: (joker: JokerId) => boolean;
  target?: (joker: JokerId) => JokerTarget | null;
  metric?: DuelMetric | null;
  secondsLeft?: number | null;
}

export function JokerBar({ scope, available, target, metric = null, secondsLeft = null }: JokerBarProps) {
  const jokers = use(JokerContext);
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const count = jokers?.uses.length ?? 0;
  const [shown, setShown] = useState({ scope, from: count });
  if (shown.scope !== scope || shown.from > count) {
    setShown({ scope, from: shown.scope !== scope ? count : 0 });
  }
  if (!jokers) {
    return null;
  }
  const recent = jokers.uses.slice(shown.scope === scope ? shown.from : count);
  const own = jokers.uses.filter((entry) => entry.side === jokers.side);
  const left = Math.max(0, JOKERS_PER_MATCH - own.length);
  const affordable = jokers.goals === null || jokers.goals >= JOKER_PRICE;
  const rivalLast = recent.filter((entry) => entry.side !== jokers.side).at(-1) ?? null;
  const reveals = recent.filter((entry) => entry.side === jokers.side && entry.reveal !== null).slice(-VISIBLE_REVEALS);
  const extraSeconds = EXTRA_TIME_SECONDS[jokers.game] ?? 0;
  const hurry =
    GAME_JOKERS[jokers.game].includes('extra-time') &&
    secondsLeft !== null &&
    secondsLeft > 0 &&
    secondsLeft <= URGENT_SECONDS &&
    left > 0 &&
    affordable &&
    (jokers.pending === null || jokers.pending === 'extra-time') &&
    available('extra-time');

  return (
    <View style={styles.container}>
      {hurry ? <HurryButton seconds={extraSeconds} pending={jokers.pending !== null} onPress={() => jokers.use('extra-time', {})} /> : null}
      <View style={styles.row}>
        <View style={styles.counter} accessible accessibilityLabel={t('jokers.left', { uses: left })}>
          <ThemedText type="label" themeColor="textSecondary">
            {uppercase(t('jokers.title'))}
          </ThemedText>
          <ThemedText style={[styles.left, left === 0 && styles.leftEmpty]}>{uppercase(t('jokers.left', { uses: left }))}</ThemedText>
        </View>
        {GAME_JOKERS[jokers.game].map((joker) => {
          const chosen = target ? target(joker) : {};
          const enabled = left > 0 && affordable && jokers.pending === null && chosen !== null && available(joker);
          const name = t(LABEL_KEYS[joker]);
          return (
            <Pressable
              key={joker}
              accessibilityRole="button"
              accessibilityLabel={t('jokers.use', { name, price: JOKER_PRICE })}
              accessibilityState={{ disabled: !enabled, busy: jokers.pending === joker }}
              disabled={!enabled}
              onPress={() => {
                haptics.tick();
                jokers.use(joker, chosen ?? {});
              }}
              style={({ pressed }) => [
                styles.button,
                !enabled && styles.buttonDisabled,
                pressed && styles.buttonPressed,
                jokers.pending === joker && styles.buttonPending,
              ]}>
              <ThemedText style={[styles.buttonLabel, !enabled && styles.buttonLabelDisabled]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {uppercase(name)}
              </ThemedText>
              <View style={styles.price}>
                <GoalIcon size={14} />
                <ThemedText style={styles.priceText}>{JOKER_PRICE}</ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>
      {reveals.map((entry, index) =>
        entry.reveal ? <RevealLine key={`${index}-${entry.joker}`} reveal={entry.reveal} market={jokers.market} metric={metric} /> : null,
      )}
      {rivalLast ? (
        <ThemedText type="small" themeColor="gold">
          {t('jokers.rivalUsed', { name: t(LABEL_KEYS[rivalLast.joker]) })}
        </ThemedText>
      ) : null}
      {!affordable && left > 0 && !jokers.error ? (
        <View style={styles.balance} accessible accessibilityLabel={t('jokers.needGoals', { price: JOKER_PRICE, goals: jokers.goals })}>
          <GoalIcon size={14} />
          <ThemedText type="small" themeColor="textSecondary">
            {t('jokers.needGoals', { price: JOKER_PRICE, goals: jokers.goals })}
          </ThemedText>
        </View>
      ) : null}
      {jokers.error ? (
        <ThemedText type="small" themeColor="negative">
          {t(errorKey(jokers.error))}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  container: {
    alignSelf: 'stretch',
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  counter: {
    minWidth: 52,
  },
  left: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    lineHeight: 18,
    color: Colors.volt,
  },
  leftEmpty: {
    color: Colors.textSecondary,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.one,
    minHeight: 44,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    backgroundColor: Colors.panel,
  },
  buttonDisabled: {
    borderColor: Colors.stroke,
    opacity: 0.55,
  },
  buttonPressed: {
    backgroundColor: Colors.panelRaised,
  },
  buttonPending: {
    borderColor: Colors.volt,
  },
  buttonLabel: {
    flexShrink: 1,
    fontFamily: Fonts.heading,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 0.5,
    color: Colors.text,
  },
  buttonLabelDisabled: {
    color: Colors.textSecondary,
  },
  price: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  priceText: {
    fontFamily: Fonts.heading,
    fontSize: 15,
    lineHeight: 18,
    color: Colors.gold,
  },
  hurry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 60,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 2,
    borderColor: Colors.volt,
    backgroundColor: Colors.negative,
  },
  hurryPressed: {
    opacity: 0.85,
  },
  hurryText: {
    flex: 1,
  },
  hurryLabel: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 1,
    color: Colors.text,
  },
  hurryTime: {
    fontFamily: Fonts.display,
    fontSize: 30,
    lineHeight: 32,
    color: Colors.text,
  },
  hurryPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    backgroundColor: Colors.ink,
  },
  hurryPriceText: {
    fontFamily: Fonts.display,
    fontSize: 22,
    lineHeight: 24,
    color: Colors.gold,
  },
});
