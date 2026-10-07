import { USERNAME_MAX_LENGTH, isValidEmail, isValidPassword, isValidUsername } from '@sportapps/protocol';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import type { RequestErrorCode } from '@/api/client';
import { useAuth } from '@/auth/auth-provider';
import { EntryGate } from '@/auth/entry-gate';
import { ERROR_KEYS } from '@/auth/error-messages';
import { useSubmit } from '@/auth/use-submit';
import { ActionButton } from '@/components/action-button';
import { FormScreen } from '@/components/form-screen';
import { PasswordRules } from '@/components/password-rules';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { MinimumTouchSize } from '@/constants/theme';
import { useUppercase } from '@/i18n/uppercase';

function RegisterScreen() {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const router = useRouter();
  const { register } = useAuth();
  const { error, submit } = useSubmit();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const problem = (): RequestErrorCode | null => {
    if (!isValidUsername(username.trim())) {
      return 'invalid-username';
    }
    if (!isValidEmail(email.trim())) {
      return 'invalid-email';
    }
    return isValidPassword(password) ? null : 'invalid-password';
  };

  return (
    <FormScreen title={t('register.title')} backLabel={t('account.back')} onBack={() => router.back()}>
      <TextField
        label={t('account.username')}
        hint={t('register.usernameHint')}
        value={username}
        onChangeText={setUsername}
        maxLength={USERNAME_MAX_LENGTH}
        textContentType="username"
        autoComplete="username-new"
        returnKeyType="next"
      />
      <TextField
        label={t('account.email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        returnKeyType="next"
      />
      <TextField
        label={t('account.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
        returnKeyType="done"
      />
      <PasswordRules password={password} />
      {error ? (
        <ThemedText type="smallBold" themeColor="negative" accessibilityLiveRegion="assertive">
          {t(ERROR_KEYS[error])}
        </ThemedText>
      ) : null}
      <ActionButton
        label={t('register.submit')}
        onPress={() => void submit(() => register({ username: username.trim(), email: email.trim(), password }), problem())}
      />
      <Pressable accessibilityRole="button" onPress={() => router.replace('/login')} style={styles.switch}>
        <ThemedText type="label" themeColor="volt">
          {uppercase(t('register.switch'))}
        </ThemedText>
      </Pressable>
    </FormScreen>
  );
}

export default function RegisterRoute() {
  return (
    <EntryGate allow="welcome">
      <RegisterScreen />
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
