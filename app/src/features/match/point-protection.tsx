import { POINT_PROTECTION_PREFIX } from '@sportapps/protocol';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { LoadedRewardedAd } from '@/ads/mobile-ads';
import { api } from '@/api';
import { useAuth } from '@/auth/auth-provider';
import { ThemedText } from '@/components/themed-text';
import { adsBuiltIn, rewardedAdUnit } from '@/constants/ads';
import { Colors, Fonts, MinimumTouchSize, Motion, Radius, Spacing } from '@/constants/theme';
import { awaitProtection } from '@/features/store/ad-reward';
import { haptics } from '@/feedback/haptics';
import { playSound } from '@/feedback/sounds';
import { useUppercase } from '@/i18n/uppercase';

const OFFER_SECONDS = 10;
const COUNTDOWN_SIZE = 40;

type Phase = 'loading' | 'ready' | 'working' | 'done' | 'pending' | 'gone';

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export function PointProtection({ matchId, lost }: { matchId: string; lost: number }) {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const { state } = useAuth();
  const token = state.status === 'signed-in' ? state.token : null;
  const userId = state.status === 'signed-in' ? state.account.id : null;
  const [phase, setPhase] = useState<Phase>('loading');
  const [seconds, setSeconds] = useState(OFFER_SECONDS);
  const [restored, setRestored] = useState(0);
  const ad = useRef<LoadedRewardedAd | null>(null);

  useEffect(() => {
    if (!token || !userId || !adsBuiltIn || !rewardedAdUnit) {
      return undefined;
    }
    const unitId = rewardedAdUnit;
    let active = true;
    let loaded: LoadedRewardedAd | null = null;

    const confirm = async () => {
      const points = await awaitProtection(() => api.pointProtection(token, matchId), wait);
      if (!active) {
        return;
      }
      if (points > 0) {
        setRestored(points);
        setPhase('done');
        playSound('correct');
        haptics.success();
      } else {
        setPhase('pending');
      }
    };

    void (async () => {
      const ads = await import('@/ads/mobile-ads');
      const refusal = await ads.prepareAds();
      if (!active) {
        return;
      }
      if (refusal) {
        setPhase('gone');
        return;
      }
      loaded = ads.loadRewardedAd(
        unitId,
        userId,
        {
          onLoaded: () => active && setPhase((current) => (current === 'loading' ? 'ready' : current)),
          onError: () => active && setPhase((current) => (current === 'loading' || current === 'ready' ? 'gone' : current)),
          onClosed: (earned) => {
            if (!active) {
              return;
            }
            if (earned) {
              void confirm();
            } else {
              setPhase('gone');
            }
          },
        },
        POINT_PROTECTION_PREFIX + matchId,
      );
      ad.current = loaded;
    })();

    return () => {
      active = false;
      loaded?.release();
      ad.current = null;
    };
  }, [token, userId, matchId]);

  useEffect(() => {
    if (phase !== 'ready') {
      return undefined;
    }
    const timer = setInterval(() => setSeconds((current) => current - 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  if (phase === 'loading' || phase === 'gone' || (phase === 'ready' && seconds <= 0)) {
    return null;
  }

  if (phase === 'done' || phase === 'pending') {
    return (
      <ThemedText
        type="smallBold"
        themeColor={phase === 'done' ? 'positive' : 'textSecondary'}
        style={styles.centered}
        accessibilityLiveRegion="polite">
        {phase === 'done' ? uppercase(t('reward.protected', { points: restored })) : t('reward.protectPending')}
      </ThemedText>
    );
  }

  if (phase === 'working') {
    return (
      <View style={styles.working}>
        <ActivityIndicator color={Colors.blue} />
        <ThemedText type="small" themeColor="textSecondary">
          {t('reward.protecting')}
        </ThemedText>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(Motion.base)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('reward.protect')}. ${t('reward.protectHint', { points: lost })}`}
        onPress={() => {
          haptics.select();
          setPhase('working');
          ad.current?.show();
        }}
        style={({ pressed }) => [styles.offer, pressed && styles.offerPressed]}>
        <View style={styles.text}>
          <ThemedText style={styles.title}>{uppercase(t('reward.protect'))}</ThemedText>
          <ThemedText type="small" style={styles.hint}>
            {t('reward.protectHint', { points: lost })}
          </ThemedText>
        </View>
        <View style={styles.countdown}>
          <ThemedText style={styles.countdownText}>{seconds}</ThemedText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  offer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: MinimumTouchSize + Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    backgroundColor: Colors.blue,
  },
  offerPressed: {
    opacity: 0.85,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    lineHeight: 26,
    color: Colors.onAccent,
  },
  hint: {
    color: Colors.onAccent,
  },
  countdown: {
    width: COUNTDOWN_SIZE,
    height: COUNTDOWN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: COUNTDOWN_SIZE / 2,
    backgroundColor: Colors.onAccent,
  },
  countdownText: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    lineHeight: 24,
    color: Colors.text,
  },
  working: {
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
