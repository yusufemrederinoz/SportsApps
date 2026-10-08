import type { IdentityProvider } from '@sportapps/protocol';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';

import { ApiRequestError } from '@/api/client';
import { ActionButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { Colors, MinimumTouchSize, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

import { useAuth } from './auth-provider';
import { ERROR_KEYS } from './error-messages';
import { requestAppleToken, requestGoogleToken } from './identity';

const REQUESTS: Record<IdentityProvider, () => Promise<string | null>> = {
  google: requestGoogleToken,
  apple: requestAppleToken,
};

function useAppleAvailable(): boolean {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return undefined;
    }
    let cancelled = false;
    void AppleAuthentication.isAvailableAsync().then((result) => {
      if (!cancelled) {
        setAvailable(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return available;
}

export function IdentityButtons() {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const { signInWith } = useAuth();
  const appleAvailable = useAppleAvailable();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const enter = async (provider: IdentityProvider) => {
    if (busy) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const token = await REQUESTS[provider]();
      if (token) {
        await signInWith(provider, token);
        haptics.success();
      }
    } catch (error) {
      haptics.error();
      setMessage(t(error instanceof ApiRequestError ? ERROR_KEYS[error.code] : 'identity.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.divider}>
        <View style={styles.line} />
        <ThemedText type="label" themeColor="textSecondary">
          {uppercase(t('identity.or'))}
        </ThemedText>
        <View style={styles.line} />
      </View>
      <ActionButton label={t('identity.google')} onPress={() => void enter('google')} variant="secondary" />
      {appleAvailable ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
          cornerRadius={Radius.medium}
          style={styles.apple}
          onPress={() => void enter('apple')}
        />
      ) : null}
      {message ? (
        <ThemedText type="smallBold" themeColor="negative" accessibilityLiveRegion="assertive">
          {message}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.stroke,
  },
  apple: {
    alignSelf: 'stretch',
    height: MinimumTouchSize + Spacing.three,
  },
});
