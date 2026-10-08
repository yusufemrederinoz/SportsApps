import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAuth } from '@/auth/auth-provider';
import { EntryGate } from '@/auth/entry-gate';
import { ActionButton } from '@/components/action-button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { MetalPlate } from '@/components/metal-plate';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Finishes, Fonts, MinimumTouchSize, Motion, Radius, Spacing } from '@/constants/theme';
import { MatchHistory } from '@/features/account/match-history';
import { useUppercase } from '@/i18n/uppercase';

function AccountScreen() {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const router = useRouter();
  const { state, leave, remove, retry } = useAuth();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  const account = state.status === 'signed-in' ? state.account : null;

  const run = async (work: () => Promise<void>) => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await work();
    } finally {
      setBusy(false);
    }
  };

  const detail = (label: string, value: string) => (
    <View style={styles.detail}>
      <ThemedText type="label" themeColor="textSecondary">
        {uppercase(label)}
      </ThemedText>
      <ThemedText type="smallBold" numberOfLines={1} style={styles.detailValue}>
        {value}
      </ThemedText>
    </View>
  );

  return (
    <Screen contentStyle={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back} hitSlop={Spacing.two}>
          <ThemedText type="label" themeColor="textSecondary">
            {`‹ ${uppercase(t('account.back'))}`}
          </ThemedText>
        </Pressable>
        <ThemedText type="title" accessibilityRole="header">
          {uppercase(t('account.title'))}
        </ThemedText>

        {account ? (
          <Animated.View entering={FadeInDown.duration(Motion.slow)} style={styles.section}>
            <MetalPlate finish={account.isGuest ? null : Finishes.x} cut="right" cutSize={22} radius={14} style={styles.identity}>
              <View style={styles.identityContent}>
                <ThemedText
                  style={[styles.identityName, { color: account.isGuest ? Colors.text : Finishes.x.ink }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}>
                  {account.username}
                </ThemedText>
                <ThemedText type="label" style={{ color: account.isGuest ? Colors.volt : Finishes.x.ink }}>
                  {uppercase(t(account.isGuest ? 'account.guestBadge' : 'account.memberBadge'))}
                </ThemedText>
              </View>
            </MetalPlate>
            <View style={styles.details}>
              {detail(t('account.username'), account.username)}
              {account.email ? detail(t('account.email'), account.email) : null}
            </View>
            {account.isGuest ? <ThemedText themeColor="textSecondary">{t('account.guestNote')}</ThemedText> : null}
            {state.status === 'signed-in' ? <MatchHistory token={state.token} /> : null}
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(Motion.slow)} style={styles.section}>
            <ThemedText type="subtitle" themeColor="negative">
              {uppercase(t('account.offline'))}
            </ThemedText>
            <ThemedText themeColor="textSecondary">{t('account.offlineHint')}</ThemedText>
            <ActionButton label={t('account.retry')} onPress={() => void run(retry)} />
          </Animated.View>
        )}

      </ScrollView>

      <View style={styles.footer}>
        <Pressable accessibilityRole="link" onPress={() => router.push('/credits')} style={styles.credits}>
          <ThemedText type="label" themeColor="textSecondary" style={styles.creditsLabel}>
            {`${uppercase(t('account.credits'))} ›`}
          </ThemedText>
        </Pressable>
        <ActionButton label={t('account.logout')} onPress={() => void run(leave)} variant="secondary" />
        {account ? (
          <Pressable accessibilityRole="button" onPress={() => setConfirming(true)} style={styles.credits}>
            <ThemedText type="label" themeColor="negative" style={styles.creditsLabel}>
              {uppercase(t('account.delete'))}
            </ThemedText>
          </Pressable>
        ) : null}
        {failed ? (
          <ThemedText type="small" themeColor="negative" style={styles.creditsLabel} accessibilityLiveRegion="assertive">
            {t('account.deleteFailed')}
          </ThemedText>
        ) : null}
      </View>
      {confirming ? (
        <ConfirmDialog
          title={t('account.deleteTitle')}
          message={t(account?.isGuest ? 'account.deleteGuestMessage' : 'account.deleteMessage')}
          confirmLabel={t('account.deleteConfirm')}
          cancelLabel={t('account.deleteCancel')}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            setFailed(false);
            void run(remove).catch(() => setFailed(true));
          }}
        />
      ) : null}
    </Screen>
  );
}

export default function AccountRoute() {
  return (
    <EntryGate allow="app">
      <AccountScreen />
    </EntryGate>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  scroll: {
    flex: 1,
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
  section: {
    gap: Spacing.three,
  },
  identity: {
    minHeight: 96,
    justifyContent: 'center',
  },
  identityContent: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.half,
  },
  identityName: {
    fontFamily: Fonts.display,
    fontSize: 38,
    lineHeight: 40,
  },
  details: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.stroke,
    backgroundColor: Colors.panel,
    paddingHorizontal: Spacing.three,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    minHeight: MinimumTouchSize,
  },
  detailValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
  footer: {
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  credits: {
    minHeight: MinimumTouchSize,
    justifyContent: 'center',
  },
  creditsLabel: {
    textAlign: 'center',
  },
});
