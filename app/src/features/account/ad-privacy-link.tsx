import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { adsBuiltIn } from '@/constants/ads';
import { MinimumTouchSize } from '@/constants/theme';
import { useUppercase } from '@/i18n/uppercase';

export function AdPrivacyLink() {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const [required, setRequired] = useState(false);

  useEffect(() => {
    if (!adsBuiltIn) {
      return undefined;
    }
    let active = true;
    import('@/ads/mobile-ads')
      .then((ads) => ads.needsPrivacyOptions())
      .then((needed) => {
        if (active) {
          setRequired(needed);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (!required) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => void import('@/ads/mobile-ads').then((ads) => ads.showPrivacyOptions()).catch(() => undefined)}
      style={styles.link}>
      <ThemedText type="label" themeColor="textSecondary" style={styles.label}>
        {uppercase(t('account.adPrivacy'))}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    minHeight: MinimumTouchSize,
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
});
