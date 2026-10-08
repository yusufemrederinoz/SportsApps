import type { AdStatusResponse } from '@sportapps/protocol';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import type { LoadedRewardedAd } from '@/ads/mobile-ads';
import { api } from '@/api';
import { GoalIcon } from '@/components/goal-icon';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MinimumTouchSize, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/feedback/haptics';
import { playSound } from '@/feedback/sounds';
import { useUppercase } from '@/i18n/uppercase';

import { adRowState, awaitAdReward, type AdPhase } from './ad-reward';

const HINT_KEYS = {
  ready: 'store.adLeft',
  busy: 'store.adLoading',
  spent: 'store.adSpent',
  unavailable: 'store.adUnavailable',
} as const;

interface RewardedGoalsProps {
  token: string;
  userId: string;
  unitId: string;
  onGoals: (goals: number) => void;
}

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export function RewardedGoals({ token, userId, unitId, onGoals }: RewardedGoalsProps) {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const [status, setStatus] = useState<AdStatusResponse | null>(null);
  const [offline, setOffline] = useState(false);
  const [phase, setPhase] = useState<AdPhase>('preparing');
  const [round, setRound] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; good: boolean } | null>(null);
  const ad = useRef<LoadedRewardedAd | null>(null);
  const latest = useRef<AdStatusResponse | null>(null);

  useEffect(() => {
    let active = true;
    api
      .ads(token)
      .then((current) => {
        if (active) {
          latest.current = current;
          setStatus(current);
        }
      })
      .catch(() => {
        if (active) {
          setOffline(true);
        }
      });
    return () => {
      active = false;
    };
  }, [token, round]);

  useEffect(() => {
    let active = true;
    let loaded: LoadedRewardedAd | null = null;

    const next = () => {
      setPhase('loading');
      setRound((value) => value + 1);
    };

    const credit = async () => {
      setPhase('crediting');
      const before = latest.current;
      const current = before ? await awaitAdReward(() => api.ads(token), before, wait) : null;
      if (!active) {
        return;
      }
      if (before && current) {
        latest.current = current;
        setStatus(current);
        onGoals(current.goals);
        playSound('win');
        haptics.success();
        setNotice({ text: t('store.granted', { goals: current.goals - before.goals }), good: true });
      } else {
        setNotice({ text: t('store.adPending'), good: false });
      }
      next();
    };

    void (async () => {
      const ads = await import('@/ads/mobile-ads');
      const refusal = await ads.prepareAds();
      if (!active) {
        return;
      }
      const fail = (detail: string) => {
        if (active) {
          setProblem(detail);
          setPhase('unavailable');
        }
      };
      if (refusal) {
        fail(refusal);
        return;
      }
      loaded = ads.loadRewardedAd(unitId, userId, {
        onLoaded: () => active && setPhase('ready'),
        onError: fail,
        onClosed: (earned) => {
          if (active) {
            void (earned ? credit() : next());
          }
        },
      });
      ad.current = loaded;
    })();

    return () => {
      active = false;
      loaded?.release();
      ad.current = null;
    };
  }, [round, token, userId, unitId, onGoals, t]);

  const state = offline ? 'unavailable' : adRowState(phase, status?.remaining ?? null);
  const disabled = state === 'busy' || state === 'spent';

  const press = () => {
    haptics.select();
    setNotice(null);
    if (state === 'ready') {
      setPhase('showing');
      ad.current?.show();
    } else {
      setOffline(false);
      setProblem(null);
      setPhase('loading');
      setRound((value) => value + 1);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('store.adWatch', { goals: status?.reward ?? '' })}
        accessibilityState={{ disabled, busy: state === 'busy' }}
        disabled={disabled}
        onPress={press}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed, state === 'spent' && styles.rowSpent]}>
        <View style={styles.text}>
          <ThemedText style={styles.title}>{uppercase(t('store.adTitle'))}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t(phase === 'crediting' ? 'store.adCrediting' : HINT_KEYS[state], { left: status?.remaining ?? 0 })}
            {state === 'unavailable' && problem ? ` (${problem})` : ''}
          </ThemedText>
        </View>
        <View style={styles.reward}>
          {state === 'busy' ? (
            <ActivityIndicator color={Colors.onAccent} />
          ) : (
            <>
              <GoalIcon size={18} />
              <ThemedText style={styles.rewardText}>{`+${status?.reward ?? ''}`}</ThemedText>
            </>
          )}
        </View>
      </Pressable>
      {notice ? (
        <ThemedText
          type="smallBold"
          themeColor={notice.good ? 'positive' : 'textSecondary'}
          style={styles.notice}
          accessibilityLiveRegion="polite">
          {notice.text}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: MinimumTouchSize + Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 1.5,
    borderColor: Colors.volt,
    backgroundColor: Colors.panel,
  },
  rowPressed: {
    backgroundColor: Colors.panelRaised,
  },
  rowSpent: {
    borderColor: Colors.stroke,
    opacity: 0.6,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    lineHeight: 26,
    color: Colors.text,
  },
  reward: {
    flexDirection: 'row',
    minWidth: 72,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.small,
    backgroundColor: Colors.volt,
  },
  rewardText: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    lineHeight: 22,
    color: Colors.onAccent,
  },
  notice: {
    textAlign: 'center',
  },
});
