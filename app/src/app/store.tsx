import { requireOptionalNativeModule } from 'expo';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { useAuth } from '@/auth/auth-provider';
import { EntryGate } from '@/auth/entry-gate';
import { ActionButton } from '@/components/action-button';
import { GoalIcon } from '@/components/goal-icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MinimumTouchSize, Motion, Radius, Spacing } from '@/constants/theme';
import { useProgress } from '@/features/progress/use-progress';
import { GoalShop } from '@/features/store/goal-shop';
import { useUppercase } from '@/i18n/uppercase';

const STORE_NAME = Platform.OS === 'ios' ? 'App Store' : 'Google Play';
const STORE_BUILT_IN = requireOptionalNativeModule('ExpoIap') !== null;
const CREDIT_SCALE = 1.3;

function StoreScreen() {
  const { t, i18n } = useTranslation();
  const uppercase = useUppercase();
  const router = useRouter();
  const { state } = useAuth();
  const { token, progress } = useProgress();
  const [credited, setCredited] = useState<number | null>(null);
  const pulse = useSharedValue(1);
  const balanceStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }));
  const balance = credited ?? progress?.goals ?? null;
  const isGuest = state.status === 'signed-in' && state.account.isGuest;

  useEffect(() => {
    if (credited !== null) {
      pulse.set(withSequence(withTiming(CREDIT_SCALE, { duration: Motion.quick }), withSpring(1)));
    }
  }, [credited, pulse]);

  const shop = () => {
    if (isGuest) {
      return (
        <View style={styles.notice}>
          <ThemedText themeColor="textSecondary">{t('store.guest')}</ThemedText>
          <ActionButton label={t('store.guestAction')} onPress={() => router.push('/account')} variant="secondary" />
        </View>
      );
    }
    if (!token) {
      return <ThemedText themeColor="textSecondary">{t('store.offline')}</ThemedText>;
    }
    if (!STORE_BUILT_IN) {
      return <ThemedText themeColor="textSecondary">{t('store.unsupported')}</ThemedText>;
    }
    return <GoalShop token={token} onGoals={setCredited} />;
  };

  return (
    <Screen contentStyle={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back} hitSlop={Spacing.two}>
          <ThemedText type="label" themeColor="textSecondary">
            {`‹ ${uppercase(t('store.back'))}`}
          </ThemedText>
        </Pressable>
        <ThemedText type="title" accessibilityRole="header">
          {uppercase(t('store.title'))}
        </ThemedText>

        <Animated.View entering={FadeInDown.duration(Motion.slow)} style={styles.balance}>
          <GoalIcon size={40} />
          <View style={styles.balanceInfo}>
            <ThemedText type="label" themeColor="textSecondary">
              {uppercase(t('store.balance'))}
            </ThemedText>
            <Animated.View style={[styles.balanceValue, balanceStyle]}>
              <ThemedText style={styles.balanceText} accessibilityLiveRegion="polite">
                {balance === null ? '—' : balance.toLocaleString(i18n.language)}
              </ThemedText>
            </Animated.View>
          </View>
        </Animated.View>
        <ThemedText themeColor="textSecondary">{t('store.hint')}</ThemedText>

        {shop()}

        <ThemedText type="small" themeColor="textSecondary" style={styles.payment}>
          {t('store.payment', { store: STORE_NAME })}
        </ThemedText>
      </ScrollView>
    </Screen>
  );
}

export default function StoreRoute() {
  return (
    <EntryGate allow="app">
      <StoreScreen />
    </EntryGate>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: Spacing.four,
  },
  content: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  back: {
    minHeight: MinimumTouchSize,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.stroke,
    backgroundColor: Colors.panel,
  },
  balanceInfo: {
    gap: Spacing.half,
  },
  balanceValue: {
    alignSelf: 'flex-start',
  },
  balanceText: {
    fontFamily: Fonts.heading,
    fontSize: 40,
    lineHeight: 44,
    color: Colors.gold,
  },
  notice: {
    gap: Spacing.three,
  },
  payment: {
    textAlign: 'center',
  },
});
