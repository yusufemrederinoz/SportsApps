import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { EntryGate } from '@/auth/entry-gate';
import { ERROR_KEYS } from '@/auth/error-messages';
import { IdentityButtons } from '@/auth/identity-buttons';
import { useSubmit } from '@/auth/use-submit';
import { ActionButton } from '@/components/action-button';
import { FormScreen } from '@/components/form-screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { MinimumTouchSize } from '@/constants/theme';
import { useUppercase } from '@/i18n/uppercase';

function LoginScreen() {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const router = useRouter();
  const { login } = useAuth();
  const { error, submit, clearError } = useSubmit();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const edit = (set: (value: string) => void) => (value: string) => {
    set(value);
    clearError();
  };
  const incomplete = email.trim().length === 0 || password.length === 0;

  return (
    <FormScreen title={t('login.title')} backLabel={t('account.back')} onBack={() => router.back()}>
      <TextField
        label={t('account.email')}
        value={email}
        onChangeText={edit(setEmail)}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        returnKeyType="next"
      />
      <TextField
        label={t('account.password')}
        value={password}
        onChangeText={edit(setPassword)}
        secureTextEntry
        textContentType="password"
        autoComplete="current-password"
        returnKeyType="done"
      />
      {error ? (
        <ThemedText type="smallBold" themeColor="negative" accessibilityLiveRegion="assertive">
          {t(ERROR_KEYS[error])}
        </ThemedText>
      ) : null}
      <ActionButton
        label={t('login.submit')}
        onPress={() => void submit(() => login({ email: email.trim(), password }), incomplete ? 'validation' : null)}
      />
      <Pressable accessibilityRole="button" onPress={() => router.replace('/register')} style={styles.switch}>
        <ThemedText type="label" themeColor="volt">
          {uppercase(t('login.switch'))}
        </ThemedText>
      </Pressable>
      <IdentityButtons />
    </FormScreen>
  );
}

export default function LoginRoute() {
  return (
    <EntryGate allow="welcome">
      <LoginScreen />
    </EntryGate>
  );
}

const styles = StyleSheet.create({
  switch: {
    minHeight: MinimumTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
