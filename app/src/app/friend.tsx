import { ROOM_CODE_LENGTH, isRoomCode, normalizeRoomCode } from '@sportapps/protocol';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { EntryGate } from '@/auth/entry-gate';
import { ActionButton } from '@/components/action-button';
import { FormScreen } from '@/components/form-screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { GAME_LABELS, parseGame } from '@/features/games';
import { parseDifficulty } from '@/features/match/difficulty';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

function FriendScreen() {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const router = useRouter();
  const params = useLocalSearchParams<{ difficulty?: string; game?: string }>();
  const difficulty = String(parseDifficulty(params.difficulty));
  const game = parseGame(params.game);
  const [code, setCode] = useState('');
  const [rejected, setRejected] = useState(false);

  const join = () => {
    if (!isRoomCode(code)) {
      setRejected(true);
      haptics.error();
      return;
    }
    router.push({ pathname: '/match', params: { mode: 'online', entry: 'join', code, difficulty } });
  };

  return (
    <FormScreen title={t('friend.title')} backLabel={t('account.back')} onBack={() => router.back()}>
      <View style={styles.section}>
        <ThemedText type="subtitle" themeColor="volt">
          {uppercase(t('friend.createTitle'))}
        </ThemedText>
        <ThemedText themeColor="textSecondary">{t('friend.createHint')}</ThemedText>
        <ThemedText type="smallBold" themeColor="gold">
          {t('friend.createGame', { game: t(GAME_LABELS[game]) })}
        </ThemedText>
        <ActionButton
          label={t('friend.create')}
          onPress={() => router.push({ pathname: '/match', params: { mode: 'online', entry: 'host', difficulty, game } })}
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <ThemedText type="subtitle" themeColor="volt">
          {uppercase(t('friend.joinTitle'))}
        </ThemedText>
        <TextField
          label={t('friend.codeLabel')}
          hint={t('friend.codeHint')}
          value={code}
          onChangeText={(text) => {
            setRejected(false);
            setCode(normalizeRoomCode(text));
          }}
          maxLength={ROOM_CODE_LENGTH}
          autoCapitalize="characters"
          autoComplete="off"
          returnKeyType="go"
          onSubmitEditing={join}
          style={styles.code}
        />
        {rejected ? (
          <ThemedText type="smallBold" themeColor="negative" accessibilityLiveRegion="assertive">
            {t('online.failureRoomNotFound')}
          </ThemedText>
        ) : null}
        <ActionButton label={t('friend.join')} onPress={join} variant="secondary" />
      </View>
    </FormScreen>
  );
}

export default function FriendRoute() {
  return (
    <EntryGate allow="app">
      <FriendScreen />
    </EntryGate>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.stroke,
    marginVertical: Spacing.two,
  },
  code: {
    fontFamily: Fonts.heading,
    fontSize: 26,
    letterSpacing: 6,
  },
});
