import { USERNAME_MAX_LENGTH, isValidUsername } from '@sportapps/protocol';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/auth/auth-provider';
import { EntryGate } from '@/auth/entry-gate';
import { ERROR_KEYS } from '@/auth/error-messages';
import { useSubmit } from '@/auth/use-submit';
import { ActionButton } from '@/components/action-button';
import { FormScreen } from '@/components/form-screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';

function UsernameScreen() {
  const { t } = useTranslation();
  const { chooseUsername, leave } = useAuth();
  const { error, submit, clearError } = useSubmit();
  const [username, setUsername] = useState('');

  return (
    <FormScreen title={t('username.title')} backLabel={t('account.logout')} onBack={() => void leave()}>
      <ThemedText themeColor="textSecondary">{t('username.intro')}</ThemedText>
      <TextField
        label={t('account.username')}
        hint={t('register.usernameHint')}
        value={username}
        onChangeText={(value) => {
          setUsername(value);
          clearError();
        }}
        maxLength={USERNAME_MAX_LENGTH}
        textContentType="username"
        autoComplete="username-new"
        returnKeyType="done"
      />
      {error ? (
        <ThemedText type="smallBold" themeColor="negative" accessibilityLiveRegion="assertive">
          {t(ERROR_KEYS[error])}
        </ThemedText>
      ) : null}
      <ActionButton
        label={t('username.submit')}
        onPress={() =>
          void submit(() => chooseUsername(username.trim()), isValidUsername(username.trim()) ? null : 'invalid-username')
        }
      />
    </FormScreen>
  );
}

export default function UsernameRoute() {
  return (
    <EntryGate allow="username">
      <UsernameScreen />
    </EntryGate>
  );
}
