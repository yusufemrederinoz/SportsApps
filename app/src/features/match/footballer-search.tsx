import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MinimumTouchSize, Radius, Spacing } from '@/constants/theme';
import { searchFootballers } from '@/data/queries';
import type { FootballerSummary } from '@/data/types';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

import { flagEmoji } from './flags';
import { URGENT_SECONDS } from './use-match-effects';

interface FootballerSearchProps {
  title: string;
  market: string;
  secondsLeft: number;
  excludedIds: readonly number[];
  onSelect: (footballer: FootballerSummary) => void;
  onClose: () => void;
}

export function FootballerSearch({ title, market, secondsLeft, excludedIds, onSelect, onClose }: FootballerSearchProps) {
  const database = useSQLiteContext();
  const { t } = useTranslation();
  const uppercase = useUppercase();
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
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <ThemedText type="label" style={styles.title} numberOfLines={2}>
              {uppercase(title)}
            </ThemedText>
            <ThemedText type="score" themeColor={secondsLeft <= URGENT_SECONDS ? 'negative' : 'floodlight'}>
              {secondsLeft}
            </ThemedText>
          </View>
          <TextInput
            autoFocus
            autoCorrect={false}
            autoCapitalize="words"
            accessibilityLabel={t('search.placeholder')}
            value={text}
            onChangeText={setText}
            placeholder={t('search.placeholder')}
            placeholderTextColor={Colors.textSecondary}
            selectionColor={Colors.pitch}
            style={styles.input}
          />
          <FlatList
            data={results}
            keyExtractor={(footballer) => String(footballer.id)}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                {searched ? t('search.empty') : t('search.hint')}
              </ThemedText>
            }
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.birthYear ? `${item.name}, ${item.birthYear}` : item.name}
                onPress={() => {
                  haptics.select();
                  onSelect(item);
                }}
                style={({ pressed }) => [styles.result, pressed && styles.resultPressed]}>
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
            <ThemedText type="label" themeColor="textSecondary">
              {uppercase(t('search.cancel'))}
            </ThemedText>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    fontSize: 18,
    lineHeight: 22,
  },
  input: {
    minHeight: MinimumTouchSize + Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 1.5,
    borderColor: Colors.pitch,
    backgroundColor: Colors.surface,
    color: Colors.text,
    fontFamily: Fonts.body,
    fontSize: 18,
    paddingHorizontal: Spacing.three,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: MinimumTouchSize + Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.small,
  },
  resultPressed: {
    backgroundColor: Colors.surfaceRaised,
  },
  resultFlag: {
    width: 28,
  },
  resultName: {
    flex: 1,
    fontSize: 17,
  },
  cancel: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MinimumTouchSize,
  },
});
