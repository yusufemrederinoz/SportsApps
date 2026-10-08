import { useNetworkState } from 'expo-network';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Motion, Spacing } from '@/constants/theme';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';
import { isOffline } from '@/network/offline';

export function OfflineBanner() {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const insets = useSafeAreaInsets();
  const offline = isOffline(useNetworkState());

  useEffect(() => {
    if (offline) {
      haptics.warning();
    }
  }, [offline]);

  if (!offline) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeInUp.duration(Motion.base)}
      exiting={FadeOutUp.duration(Motion.quick)}
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={[styles.banner, { paddingTop: insets.top + Spacing.two }]}>
      <ThemedText style={styles.title}>{uppercase(t('network.offline'))}</ThemedText>
      <ThemedText type="small" style={styles.hint}>
        {t('network.offlineHint')}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 100,
    alignItems: 'center',
    gap: Spacing.half,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    backgroundColor: Colors.negative,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    lineHeight: 24,
    color: Colors.text,
    textAlign: 'center',
  },
  hint: {
    color: Colors.text,
    textAlign: 'center',
  },
});
