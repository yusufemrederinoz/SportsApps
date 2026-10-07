import {
  GAME_JOKERS,
  JOKERS_PER_MATCH,
  JOKER_PRICE,
  type DuelMetric,
  type JokerId,
  type JokerReveal,
  type JokerTarget,
  type PlayErrorCode,
} from '@sportapps/protocol';
import { use, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { GoalIcon } from '@/components/goal-icon';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Motion, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

import { JokerContext } from './joker-context';
import { useRevealText } from './reveal-text';

const VISIBLE_REVEALS = 2;

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

interface JokerBarProps {
  scope: string | number;
  available: (joker: JokerId) => boolean;
  target?: (joker: JokerId) => JokerTarget | null;
  metric?: DuelMetric | null;
}

export function JokerBar({ scope, available, target, metric = null }: JokerBarProps) {
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

  return (
    <View style={styles.container}>
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
});
