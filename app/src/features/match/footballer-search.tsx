import type { DuelConcept } from '@sportapps/protocol';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MinimumTouchSize, Radius, Spacing } from '@/constants/theme';
import { searchConceptFootballers, searchDraftFootballers, searchFootballers } from '@/data/queries';
import type { FootballerSummary } from '@/data/types';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

import { URGENT_SECONDS } from './use-match-effects';

const ROLE_KEYS = { GK: 'role.GK', DF: 'role.DF', MF: 'role.MF', FW: 'role.FW' } as const;
const NO_ROLE = '-';

export type SearchFilter =
  | { kind: 'concept'; concept: DuelConcept }
  | { kind: 'draft'; clubId: number; positions: readonly string[]; excludedIds: readonly number[] };

function runSearch(
  database: Parameters<typeof searchFootballers>[0],
  market: string,
  filter: SearchFilter | null,
  text: string,
) {
  if (!filter) {
    return searchFootballers(database, market, text);
  }
  return filter.kind === 'concept'
    ? searchConceptFootballers(database, market, filter.concept, text)
    : searchDraftFootballers(database, market, filter.clubId, filter.positions, filter.excludedIds, text);
}

interface FootballerSearchProps {
  title: string;
  market: string;
  secondsLeft: number;
  excludedIds: readonly number[];
  filter?: SearchFilter | null;
  emptyLabel?: string;
  closeLabel?: string;
  footer?: ReactNode;
  onSelect: (footballer: FootballerSummary) => void;
  onClose: () => void;
}

export function FootballerSearch({
  title,
  market,
  secondsLeft,
  excludedIds,
  filter = null,
  emptyLabel,
  closeLabel,
  footer,
  onSelect,
  onClose,
}: FootballerSearchProps) {
  const database = useSQLiteContext();
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const [text, setText] = useState('');
  const [found, setFound] = useState<{ text: string; footballers: FootballerSummary[] }>({ text: '', footballers: [] });
  const filterKey = JSON.stringify(filter);

  useEffect(() => {
    let cancelled = false;
    void runSearch(database, market, JSON.parse(filterKey) as SearchFilter | null, text).then((footballers) => {
      if (!cancelled) {
        setFound({ text, footballers });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [database, market, filterKey, text]);

  const results = found.footballers.filter((footballer) => !excludedIds.includes(footballer.id));
  const searched = found.text === text && text.trim().length >= 2;
  const urgent = secondsLeft <= URGENT_SECONDS;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <View style={styles.accent} />
            <ThemedText style={styles.title} numberOfLines={2}>
              {uppercase(title)}
            </ThemedText>
            <View style={[styles.clock, urgent && styles.clockUrgent]}>
              <ThemedText type="score" style={[styles.clockText, { color: urgent ? Colors.negative : Colors.volt }]}>
                {secondsLeft}
              </ThemedText>
            </View>
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
            selectionColor={Colors.volt}
            style={styles.input}
          />
          <FlatList
            data={results}
            keyExtractor={(footballer) => String(footballer.id)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                {searched ? (emptyLabel ?? t('search.empty')) : t('search.hint')}
              </ThemedText>
            }
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.birthYear ? `${item.name}, ${item.birthYear}` : item.name}
                onPress={() => {
                  haptics.select();
                  setText('');
                  onSelect(item);
                }}
                style={({ pressed }) => [styles.result, pressed && styles.resultPressed]}>
                <View style={styles.role}>
                  <ThemedText style={styles.roleText}>{item.role ? t(ROLE_KEYS[item.role]) : NO_ROLE}</ThemedText>
                </View>
                <ThemedText style={styles.resultName} numberOfLines={1}>
                  {item.name}
                </ThemedText>
                <ThemedText type="label" themeColor="textSecondary">
                  {item.birthYear ?? ''}
                </ThemedText>
              </Pressable>
            )}
          />
          {footer}
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancel}>
            <ThemedText type="label" themeColor="textSecondary">
              {uppercase(closeLabel ?? t('search.cancel'))}
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
    gap: Spacing.three,
  },
  accent: {
    width: 5,
    alignSelf: 'stretch',
    borderRadius: 3,
    backgroundColor: Colors.volt,
  },
  title: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: 26,
    lineHeight: 28,
    color: Colors.text,
  },
  clock: {
    minWidth: 64,
    alignItems: 'center',
    borderRadius: Radius.medium,
    borderWidth: 1.5,
    borderColor: Colors.volt,
    backgroundColor: Colors.ink,
    paddingVertical: Spacing.one,
  },
  clockUrgent: {
    borderColor: Colors.negative,
  },
  clockText: {
    fontSize: 32,
    lineHeight: 34,
  },
  input: {
    minHeight: MinimumTouchSize + Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 2,
    borderColor: Colors.volt,
    backgroundColor: Colors.panel,
    color: Colors.text,
    fontFamily: Fonts.bodyBold,
    fontSize: 18,
    paddingHorizontal: Spacing.three,
  },
  list: {
    gap: Spacing.two,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: MinimumTouchSize + Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.stroke,
    backgroundColor: Colors.panel,
  },
  resultPressed: {
    borderColor: Colors.volt,
    backgroundColor: Colors.panelRaised,
  },
  role: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
    backgroundColor: Colors.gold,
  },
  roleText: {
    fontFamily: Fonts.display,
    fontSize: 20,
    lineHeight: 22,
    color: Colors.onAccent,
  },
  resultName: {
    flex: 1,
    fontFamily: Fonts.bodyBold,
    fontSize: 17,
    lineHeight: 22,
  },
  cancel: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MinimumTouchSize,
  },
});
