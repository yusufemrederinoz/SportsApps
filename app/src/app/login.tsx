import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { useAuth } from '@/auth/auth-provider';
import { ERROR_KEYS } from '@/auth/error-messages';
import { useSubmit } from '@/auth/use-submit';
import { ActionButton } from '@/components/action-button';
import { FormScreen } from '@/components/form-screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { MinimumTouchSize } from '@/constants/theme';
import { useUppercase } from '@/i18n/uppercase';

export default function LoginScreen() {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const router = useRouter();
  const { login } = useAuth();
  const { error, submit } = useSubmit();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const incomplete = email.trim().length === 0 || password.length === 0;

  return (
    <FormScreen title={t('login.title')} backLabel={t('account.back')} onBack={() => router.back()}>
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
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  switch: {
    minHeight: MinimumTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
