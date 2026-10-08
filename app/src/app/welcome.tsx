import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInLeft } from 'react-native-reanimated';

import { useAuth } from '@/auth/auth-provider';
import { EntryGate } from '@/auth/entry-gate';
import { ActionButton } from '@/components/action-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/brand';
import { Colors, Motion, Spacing } from '@/constants/theme';
import { GAMES } from '@/features/games';

function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { continueAsGuest } = useAuth();
  const [entering, setEntering] = useState(false);

  const enterAsGuest = async () => {
    if (entering) {
      return;
    }
    setEntering(true);
    try {
      await continueAsGuest();
    } finally {
      setEntering(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.hero} accessible accessibilityRole="header" accessibilityLabel={Brand.name}>
        <Animated.View entering={FadeInLeft.duration(Motion.slow)}>
          <ThemedText type="display">{Brand.lead.toUpperCase()}</ThemedText>
        </Animated.View>
        <Animated.View entering={FadeInLeft.duration(Motion.slow).delay(110)} style={styles.accentRow}>
          <ThemedText type="display" style={styles.accent}>
            {Brand.accent.toUpperCase()}
          </ThemedText>
          <View style={styles.slash} />
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(Motion.slow).delay(220)}>
          <ThemedText themeColor="textSecondary">{t('welcome.tagline', { games: GAMES.length })}</ThemedText>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.duration(Motion.slow).delay(320)} style={styles.actions}>
        <ActionButton label={t(entering ? 'welcome.connecting' : 'welcome.guest')} onPress={() => void enterAsGuest()} />
        <ActionButton label={t('welcome.login')} onPress={() => router.push('/login')} variant="secondary" />
        <ActionButton label={t('welcome.register')} onPress={() => router.push('/register')} variant="secondary" />
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          {t('welcome.guestHint')}
        </ThemedText>
      </Animated.View>
    </Screen>
  );
}

export default function WelcomeRoute() {
  return (
    <EntryGate allow="welcome">
      <WelcomeScreen />
    </EntryGate>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.one,
  },
  accentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  accent: {
    color: Colors.volt,
    textShadowColor: Colors.volt,
    textShadowRadius: 22,
    textShadowOffset: { width: 0, height: 0 },
  },
  slash: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.volt,
    transform: [{ rotate: '-4deg' }],
  },
  actions: {
    gap: Spacing.three,
  },
  hint: {
    textAlign: 'center',
  },
});
