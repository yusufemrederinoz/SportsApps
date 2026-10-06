import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { searchFootballers } from '@/data/queries';
import type { FootballerSummary } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';

import { flagEmoji } from './flags';

interface FootballerSearchProps {
  title: string;
  market: string;
  secondsLeft: number;
  excludedIds: readonly number[];
  onSelect: (footballer: FootballerSummary) => void;
  onClose: () => void;
}

const URGENT_SECONDS = 5;

export function FootballerSearch({ title, market, secondsLeft, excludedIds, onSelect, onClose }: FootballerSearchProps) {
  const database = useSQLiteContext();
  const theme = useTheme();
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [found, setFound] = useState<{ text: string; footballers: FootballerSummary[] }>({ text: '', footballers: [] });

  useEffect(() => {
    let cancelled = false;
    void searchFootballers(database, market, text).then((footballers) => {
      if (!cancelled) {
        setFound({ text, footballers });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [database, market, text]);

  const results = found.footballers.filter((footballer) => !excludedIds.includes(footballer.id));
  const searched = found.text === text && text.trim().length >= 2;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <ThemedText type="smallBold" style={styles.title} numberOfLines={2}>
              {title}
            </ThemedText>
            <ThemedText type="smallBold" themeColor={secondsLeft <= URGENT_SECONDS ? 'negative' : 'textSecondary'}>
              {t('match.secondsLeft', { seconds: secondsLeft })}
            </ThemedText>
          </View>
          <TextInput
            autoFocus
            autoCorrect={false}
            autoCapitalize="words"
            value={text}
            onChangeText={setText}
            placeholder={t('search.placeholder')}
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
          <FlatList
            data={results}
            keyExtractor={(footballer) => String(footballer.id)}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                {searched ? t('search.empty') : t('search.hint')}
              </ThemedText>
            }
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => onSelect(item)}
                style={({ pressed }) => [styles.result, pressed && { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={styles.resultFlag}>{flagEmoji(item.countryCode) ?? ''}</ThemedText>
                <ThemedText style={styles.resultName} numberOfLines={1}>
                  {item.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.birthYear ?? ''}
                </ThemedText>
              </Pressable>
            )}
          />
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancel}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('search.cancel')}
            </ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  title: {
    flex: 1,
  },
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
  },
  resultFlag: {
    width: 28,
  },
  resultName: {
    flex: 1,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
});
