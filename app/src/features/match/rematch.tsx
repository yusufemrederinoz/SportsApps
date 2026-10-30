import { createContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { ActionButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MinimumTouchSize, Motion, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/feedback/haptics';
import { playSound } from '@/feedback/sounds';
import { useUppercase } from '@/i18n/uppercase';

import type { RematchStatus } from './use-online-match';

const TICK_MILLISECONDS = 250;

export interface RematchControl {
  status: RematchStatus;
  rivalName: string;
  onAsk: () => void;
}

export const RematchContext = createContext<RematchControl | null>(null);

function useSecondsUntil(endsAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endsAt === null) {
      return undefined;
    }
    const timer = setInterval(() => setNow(Date.now()), TICK_MILLISECONDS);
    return () => clearInterval(timer);
  }, [endsAt]);

  return endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function RematchPanel({ control }: { control: RematchControl }) {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const { status, rivalName, onAsk } = control;
  const seconds = useSecondsUntil(status.endsAt);
  const offered = status.state === 'offered';

  useEffect(() => {
    if (offered) {
      playSound('whistle');
      haptics.warning();
    }
  }, [offered]);

  if (status.state === 'none') {
    return null;
  }

  if (status.state === 'declined' || status.state === 'expired' || (status.state === 'open' && seconds === 0)) {
    return (
      <Animated.View entering={FadeIn.duration(Motion.base)}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centered} accessibilityLiveRegion="polite">
          {t(status.state === 'declined' ? 'rematch.declined' : 'rematch.expired')}
        </ThemedText>
      </Animated.View>
    );
  }

  if (status.state === 'asking' || status.state === 'waiting') {
    return (
      <View style={styles.waiting} accessibilityLiveRegion="polite">
        <ActivityIndicator color={Colors.volt} />
        <ThemedText type="smallBold" themeColor="textSecondary">
          {t('rematch.waiting', { seconds })}
        </ThemedText>
      </View>
    );
  }

  return (
    <Animated.View entering={ZoomIn.duration(Motion.slow)} style={styles.stack}>
      {offered ? (
        <View style={styles.offer} accessibilityLiveRegion="assertive">
          <ThemedText style={styles.offerText} numberOfLines={2}>
            {uppercase(t('rematch.offered', { name: rivalName }))}
          </ThemedText>
          <ThemedText style={styles.offerSeconds}>{seconds}</ThemedText>
        </View>
      ) : null}
      <ActionButton label={t(offered ? 'rematch.accept' : 'rematch.ask')} onPress={onAsk} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stack: {
    alignSelf: 'stretch',
    gap: Spacing.two,
  },
  offer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 2,
    borderColor: Colors.gold,
    backgroundColor: Colors.panel,
  },
  offerText: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: 22,
    lineHeight: 24,
    color: Colors.gold,
  },
  offerSeconds: {
    fontFamily: Fonts.display,
    fontSize: 26,
    lineHeight: 28,
    color: Colors.text,
  },
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: MinimumTouchSize,
  },
  centered: {
    textAlign: 'center',
  },
});
