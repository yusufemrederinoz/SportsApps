import { POINT_PROTECTION_PREFIX, POINT_PROTECTION_PRICE } from '@sportapps/protocol';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import type { LoadedRewardedAd } from '@/ads/mobile-ads';
import { api } from '@/api';
import { ApiRequestError } from '@/api/client';
import { useAuth } from '@/auth/auth-provider';
import { ERROR_KEYS } from '@/auth/error-messages';
import { GoalIcon } from '@/components/goal-icon';
import { ThemedText } from '@/components/themed-text';
import { adsBuiltIn, rewardedAdUnit } from '@/constants/ads';
import { Colors, Fonts, MinimumTouchSize, Motion, Radius, Spacing } from '@/constants/theme';
import { awaitProtection } from '@/features/store/ad-reward';
import { haptics } from '@/feedback/haptics';
import { playSound } from '@/feedback/sounds';
import { useUppercase } from '@/i18n/uppercase';

import { signed } from './match-reward';

const OFFER_SECONDS = 15;
const COUNTDOWN_SIZE = 44;

type AdState = 'loading' | 'ready' | 'gone';
type Phase = 'offer' | 'working' | 'done' | 'pending' | 'closed';

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

interface PointProtectionProps {
  matchId: string;
  lost: number;
  goals: number;
  onProtected: (points: number) => void;
}

export function PointProtection({ matchId, lost, goals, onProtected }: PointProtectionProps) {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const { state } = useAuth();
  const token = state.status === 'signed-in' ? state.token : null;
  const userId = state.status === 'signed-in' ? state.account.id : null;
  const [phase, setPhase] = useState<Phase>('offer');
  const [adState, setAdState] = useState<AdState>(adsBuiltIn && rewardedAdUnit ? 'loading' : 'gone');
  const [seconds, setSeconds] = useState(OFFER_SECONDS);
  const [restored, setRestored] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const ad = useRef<LoadedRewardedAd | null>(null);
  const affordable = goals >= POINT_PROTECTION_PRICE;

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
        onProtected(points);
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
        setAdState('gone');
        return;
      }
      loaded = ads.loadRewardedAd(
        unitId,
        userId,
        {
          onLoaded: () => active && setAdState('ready'),
          onError: () => active && setAdState('gone'),
          onClosed: (earned) => {
            if (!active) {
              return;
            }
            if (earned) {
              void confirm();
            } else {
              setAdState('gone');
              setPhase('offer');
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
  }, [token, userId, matchId, onProtected]);

  const counting = phase === 'offer' && seconds > 0;

  useEffect(() => {
    if (!counting) {
      return undefined;
    }
    const timer = setInterval(() => setSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => clearInterval(timer);
  }, [counting]);

  const payWithGoals = async () => {
    if (!token) {
      return;
    }
    haptics.select();
    setError(null);
    setPhase('working');
    try {
      const purchase = await api.buyPointProtection(token, matchId);
      setRestored(purchase.points);
      onProtected(purchase.points);
      setPhase('done');
      playSound('correct');
      haptics.success();
    } catch (failure) {
      const code = failure instanceof ApiRequestError ? failure.code : 'internal';
      if (code === 'protection-unavailable') {
        setPhase('closed');
        return;
      }
      setError(t(ERROR_KEYS[code]));
      setPhase('offer');
    }
  };

  const nothingToOffer = adState === 'gone' && !affordable;
  if (phase === 'closed' || (phase === 'offer' && (seconds <= 0 || nothingToOffer))) {
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
        <ActivityIndicator color={Colors.gold} />
        <ThemedText type="small" themeColor="textSecondary">
          {t('reward.protecting')}
        </ThemedText>
      </View>
    );
  }

  return (
    <Animated.View entering={ZoomIn.duration(Motion.slow)} style={styles.card}>
      <View style={styles.top}>
        <View style={styles.text}>
          <ThemedText style={styles.title}>{uppercase(t('reward.protect'))}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('reward.protectHint', { points: lost })}
          </ThemedText>
        </View>
        <ThemedText style={styles.lost}>{signed(-lost)}</ThemedText>
        <View style={styles.countdown}>
          <ThemedText style={styles.countdownText}>{seconds}</ThemedText>
        </View>
      </View>
      <View style={styles.actions}>
        {adState !== 'gone' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('reward.protectAd')}. ${t('reward.protectHint', { points: lost })}`}
            accessibilityState={{ disabled: adState !== 'ready', busy: adState === 'loading' }}
            disabled={adState !== 'ready'}
            onPress={() => {
              haptics.select();
              setPhase('working');
              ad.current?.show();
            }}
            style={({ pressed }) => [styles.action, styles.adAction, pressed && styles.pressed]}>
            {adState === 'loading' ? <ActivityIndicator color={Colors.onAccent} /> : null}
            <ThemedText style={styles.adLabel}>{uppercase(t('reward.protectAd'))}</ThemedText>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('reward.protectGoals', { price: POINT_PROTECTION_PRICE })}. ${t('reward.protectHint', { points: lost })}`}
          accessibilityState={{ disabled: !affordable }}
          disabled={!affordable}
          onPress={() => void payWithGoals()}
          style={({ pressed }) => [styles.action, styles.goalAction, !affordable && styles.disabled, pressed && styles.pressed]}>
          <GoalIcon size={22} />
          <ThemedText style={styles.goalLabel}>{uppercase(t('reward.protectGoals', { price: POINT_PROTECTION_PRICE }))}</ThemedText>
        </Pressable>
      </View>
      {!affordable ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
          {t('reward.protectNeedGoals', { price: POINT_PROTECTION_PRICE, goals })}
        </ThemedText>
      ) : null}
      {error ? (
        <ThemedText type="small" themeColor="negative" style={styles.centered}>
          {error}
        </ThemedText>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 2,
    borderColor: Colors.negative,
    backgroundColor: Colors.panel,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 26,
    lineHeight: 28,
    color: Colors.text,
  },
  lost: {
    fontFamily: Fonts.display,
    fontSize: 40,
    lineHeight: 42,
    color: Colors.negative,
  },
  countdown: {
    width: COUNTDOWN_SIZE,
    height: COUNTDOWN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: COUNTDOWN_SIZE / 2,
    borderWidth: 2,
    borderColor: Colors.negative,
  },
  countdownText: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    lineHeight: 24,
    color: Colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: MinimumTouchSize + Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.medium,
  },
  adAction: {
    backgroundColor: Colors.blue,
  },
  goalAction: {
    borderWidth: 2,
    borderColor: Colors.gold,
    backgroundColor: Colors.ink,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.85,
  },
  adLabel: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    lineHeight: 22,
    color: Colors.onAccent,
  },
  goalLabel: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    lineHeight: 22,
    color: Colors.gold,
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
