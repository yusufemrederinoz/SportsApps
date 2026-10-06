import { isValidEmail, isValidPassword, isValidUsername } from '@sportapps/protocol';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { errorCodeOf, type RequestErrorCode } from '@/api/client';
import { ActionButton } from '@/components/action-button';
import { MetalPlate } from '@/components/metal-plate';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Colors, Finishes, Fonts, MinimumTouchSize, Motion, Spacing } from '@/constants/theme';
import { useAuth } from '@/auth/auth-provider';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

type Form = 'register' | 'login';

const ERROR_KEYS = {
  network: 'errors.network',
  unconfigured: 'errors.unconfigured',
  validation: 'errors.validation',
  unauthorized: 'errors.unauthorized',
  'invalid-credentials': 'errors.invalidCredentials',
  'email-taken': 'errors.emailTaken',
  'username-taken': 'errors.usernameTaken',
  'invalid-username': 'errors.invalidUsername',
  'invalid-email': 'errors.invalidEmail',
  'invalid-password': 'errors.invalidPassword',
  'provider-unavailable': 'errors.providerUnavailable',
  'invalid-identity-token': 'errors.invalidIdentityToken',
  'rate-limited': 'errors.rateLimited',
  'not-found': 'errors.internal',
  internal: 'errors.internal',
} as const satisfies Record<RequestErrorCode, string>;

export default function AccountScreen() {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const router = useRouter();
  const { state, register, login, rename, logout, retry } = useAuth();
  const [form, setForm] = useState<Form>('register');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<RequestErrorCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const account = state.status === 'signed-in' ? state.account : null;

  const submit = async (work: () => Promise<void>, check: RequestErrorCode | null = null) => {
    if (busy) {
      return;
    }
    setSaved(false);
    if (check) {
      setError(check);
      haptics.error();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await work();
      haptics.success();
      setPassword('');
      setSaved(true);
    } catch (failure) {
      setError(errorCodeOf(failure));
      haptics.error();
    } finally {
      setBusy(false);
    }
  };

  const registerCheck = (): RequestErrorCode | null => {
    if (!isValidUsername(username.trim())) {
      return 'invalid-username';
    }
    if (!isValidEmail(email.trim())) {
      return 'invalid-email';
    }
    return isValidPassword(password) ? null : 'invalid-password';
  };

  const header = (
    <View style={styles.topBar}>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back} hitSlop={Spacing.two}>
        <ThemedText type="label" themeColor="textSecondary">
          {`‹ ${uppercase(t('account.back'))}`}
        </ThemedText>
      </Pressable>
      <ThemedText type="title" accessibilityRole="header">
        {uppercase(t('account.title'))}
      </ThemedText>
    </View>
  );

  if (!account) {
    return (
      <Screen contentStyle={styles.content}>
        {header}
        <View style={styles.centered}>
          <ThemedText type="subtitle" themeColor={state.status === 'offline' ? 'negative' : 'textSecondary'}>
            {uppercase(t(state.status === 'offline' ? 'account.offline' : 'account.connecting'))}
          </ThemedText>
          {state.status === 'offline' ? (
            <>
              <ThemedText themeColor="textSecondary" style={styles.centeredText}>
                {t('account.offlineHint')}
              </ThemedText>
              <ActionButton label={t('account.retry')} onPress={() => void retry()} />
            </>
          ) : null}
        </View>
      </Screen>
    );
  }

  const feedback = error ? (
    <ThemedText type="smallBold" themeColor="negative" accessibilityLiveRegion="assertive">
      {t(ERROR_KEYS[error])}
    </ThemedText>
  ) : saved ? (
    <ThemedText type="smallBold" themeColor="positive" accessibilityLiveRegion="polite">
      {t('account.saved')}
    </ThemedText>
  ) : null;

  return (
    <Screen contentStyle={styles.content}>
      {header}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(Motion.slow)}>
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
                  {uppercase(account.isGuest ? t('account.guestBadge') : (account.email ?? t('account.memberBadge')))}
                </ThemedText>
              </View>
            </MetalPlate>
          </Animated.View>

          {account.isGuest ? (
            <Animated.View entering={FadeInDown.duration(Motion.slow).delay(100)} style={styles.section}>
              <ThemedText themeColor="textSecondary">{t(form === 'register' ? 'account.guestHint' : 'account.loginHint')}</ThemedText>
              {form === 'register' ? (
                <TextField label={t('account.username')} value={username} onChangeText={setUsername} maxLength={16} />
              ) : null}
              <TextField
                label={t('account.email')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
              />
              <TextField
                label={t('account.password')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType={form === 'register' ? 'newPassword' : 'password'}
                autoComplete={form === 'register' ? 'new-password' : 'current-password'}
              />
              {feedback}
              <ActionButton
                label={t(form === 'register' ? 'account.register' : 'account.login')}
                onPress={() =>
                  void (form === 'register'
                    ? submit(() => register({ username: username.trim(), email: email.trim(), password }), registerCheck())
                    : submit(() => login({ email: email.trim(), password })))
                }
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setError(null);
                  setForm(form === 'register' ? 'login' : 'register');
                }}
                style={styles.switch}>
                <ThemedText type="label" themeColor="volt">
                  {uppercase(t(form === 'register' ? 'account.haveAccount' : 'account.needAccount'))}
                </ThemedText>
              </Pressable>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.duration(Motion.slow).delay(100)} style={styles.section}>
              <TextField
                label={t('account.username')}
                value={username}
                onChangeText={setUsername}
                placeholder={account.username}
                maxLength={16}
              />
              {feedback}
              <ActionButton
                label={t('account.saveUsername')}
                onPress={() =>
                  void submit(() => rename(username.trim()), isValidUsername(username.trim()) ? null : 'invalid-username')
                }
              />
              <ActionButton label={t('account.logout')} onPress={() => void submit(logout)} variant="secondary" />
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    gap: Spacing.four,
    paddingBottom: Spacing.five,
  },
  topBar: {
    gap: Spacing.one,
  },
  back: {
    minHeight: MinimumTouchSize,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  centeredText: {
    textAlign: 'center',
  },
  identity: {
    minHeight: 92,
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
  section: {
    gap: Spacing.three,
  },
  switch: {
    minHeight: MinimumTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
