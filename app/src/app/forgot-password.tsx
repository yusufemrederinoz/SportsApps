import { RESET_CODE_LENGTH, isValidEmail, isValidPassword } from '@sportapps/protocol';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { api } from '@/api';
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

function ForgotPasswordScreen() {
  const { t, i18n } = useTranslation();
  const uppercase = useUppercase();
  const router = useRouter();
  const { resetPassword } = useAuth();
  const { error, submit, clearError } = useSubmit();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const edit = (set: (value: string) => void) => (value: string) => {
    set(value);
    clearError();
  };

  const requestCode = () =>
    void submit(
      async () => {
        await api.forgotPassword({ email: email.trim(), language: i18n.language });
        setSent(true);
      },
      isValidEmail(email.trim()) ? null : 'invalid-email',
    );

  const problem = (): RequestErrorCode | null => {
    if (code.trim().length !== RESET_CODE_LENGTH) {
      return 'invalid-reset-code';
    }
    return isValidPassword(password) ? null : 'invalid-password';
  };

  const startAgain = () => {
    clearError();
    setCode('');
    setSent(false);
  };

  return (
    <FormScreen title={t('forgot.title')} backLabel={t('account.back')} onBack={() => router.back()}>
      {sent ? (
        <>
          <ThemedText themeColor="textSecondary">{t('forgot.sent', { email: email.trim() })}</ThemedText>
          <TextField
            label={t('forgot.code')}
            value={code}
            onChangeText={edit(setCode)}
            keyboardType="number-pad"
            maxLength={RESET_CODE_LENGTH}
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            returnKeyType="next"
          />
          <TextField
            label={t('forgot.newPassword')}
            value={password}
            onChangeText={edit(setPassword)}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            returnKeyType="done"
          />
          <PasswordRules password={password} />
        </>
      ) : (
        <>
          <ThemedText themeColor="textSecondary">{t('forgot.hint')}</ThemedText>
          <TextField
            label={t('account.email')}
            value={email}
            onChangeText={edit(setEmail)}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            returnKeyType="done"
          />
        </>
      )}
      {error ? (
        <ThemedText type="smallBold" themeColor="negative" accessibilityLiveRegion="assertive">
          {t(ERROR_KEYS[error])}
        </ThemedText>
      ) : null}
      {sent ? (
        <>
          <ActionButton
            label={t('forgot.submit')}
            onPress={() => void submit(() => resetPassword({ email: email.trim(), code: code.trim(), password }), problem())}
          />
          <Pressable accessibilityRole="button" onPress={startAgain} style={styles.again}>
            <ThemedText type="label" themeColor="volt">
              {uppercase(t('forgot.again'))}
            </ThemedText>
          </Pressable>
        </>
      ) : (
        <ActionButton label={t('forgot.send')} onPress={requestCode} />
      )}
    </FormScreen>
  );
}

export default function ForgotPasswordRoute() {
  return (
    <EntryGate allow="welcome">
      <ForgotPasswordScreen />
    </EntryGate>
  );
}

const styles = StyleSheet.create({
  again: {
    minHeight: MinimumTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
