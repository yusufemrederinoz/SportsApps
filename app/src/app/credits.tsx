import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Linking, Pressable, StyleSheet, View } from 'react-native';

import { EntryGate } from '@/auth/entry-gate';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, MinimumTouchSize, Radius, Spacing } from '@/constants/theme';
import { loadPortraitCredits } from '@/data/queries';
import type { PortraitCredit } from '@/data/types';
import { useUppercase } from '@/i18n/uppercase';

function CreditsScreen() {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const router = useRouter();
  const database = useSQLiteContext();
  const [credits, setCredits] = useState<PortraitCredit[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPortraitCredits(database)
      .then((rows) => {
        if (!cancelled) {
          setCredits(rows);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCredits([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [database]);

  return (
    <Screen contentStyle={styles.screen}>
      <FlatList
        data={credits ?? []}
        keyExtractor={(credit) => String(credit.playerId)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        initialNumToRender={16}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back} hitSlop={Spacing.two}>
              <ThemedText type="label" themeColor="textSecondary">
                {`‹ ${uppercase(t('account.back'))}`}
              </ThemedText>
            </Pressable>
            <ThemedText type="title" accessibilityRole="header">
              {uppercase(t('credits.title'))}
            </ThemedText>
            <ThemedText themeColor="textSecondary">{t('credits.intro')}</ThemedText>
            {credits ? (
              <ThemedText type="label" themeColor="volt">
                {uppercase(credits.length > 0 ? t('credits.count', { count: credits.length }) : t('credits.empty'))}
              </ThemedText>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`${item.name}, ${item.author}, ${item.license}`}
            accessibilityHint={t('credits.openHint')}
            disabled={item.sourceUrl.length === 0}
            onPress={() => void Linking.openURL(item.sourceUrl).catch(() => undefined)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
            <View style={styles.texts}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {item.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                {`${item.author} · ${item.license}`}
              </ThemedText>
            </View>
            <ThemedText type="label" themeColor="volt">
              ›
            </ThemedText>
          </Pressable>
        )}
      />
    </Screen>
  );
}

export default function CreditsRoute() {
  return (
    <EntryGate allow="app">
      <CreditsScreen />
    </EntryGate>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 0,
  },
  content: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  header: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  back: {
    minHeight: MinimumTouchSize,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: MinimumTouchSize + Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.stroke,
    backgroundColor: Colors.panel,
  },
  rowPressed: {
    borderColor: Colors.volt,
    backgroundColor: Colors.panelRaised,
  },
  texts: {
    flex: 1,
    gap: Spacing.half,
  },
});
