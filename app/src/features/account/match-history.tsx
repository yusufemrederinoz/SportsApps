import type { MatchSummary } from '@sportapps/protocol';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { api } from '@/api';
import { ThemedText } from '@/components/themed-text';
import { MinimumTouchSize, Spacing } from '@/constants/theme';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

import { MatchRow } from './match-row';

const VISIBLE_MATCHES = 5;

export function MatchHistory({ token }: { token: string }) {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const router = useRouter();
  const [matches, setMatches] = useState<MatchSummary[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      api
        .matches(token, { limit: VISIBLE_MATCHES })
        .then((response) => {
          if (!cancelled) {
            setMatches(response.matches);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setMatches((current) => current ?? []);
          }
        });
      return () => {
        cancelled = true;
      };
    }, [token]),
  );

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText type="label" themeColor="textSecondary">
          {uppercase(t('account.historyTitle'))}
        </ThemedText>
        <Pressable
          accessibilityRole="link"
          hitSlop={Spacing.two}
          onPress={() => {
            haptics.select();
            router.push('/history');
          }}
          style={styles.link}>
          <ThemedText type="label" themeColor="volt">
            {`${uppercase(t('history.open'))} ›`}
          </ThemedText>
        </Pressable>
      </View>
      {matches?.length === 0 ? <ThemedText themeColor="textSecondary">{t('account.historyEmpty')}</ThemedText> : null}
      {matches?.map((match) => <MatchRow key={match.id} match={match} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  link: {
    minHeight: MinimumTouchSize,
    justifyContent: 'center',
  },
});
