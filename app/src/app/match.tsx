import { countCells, usedFootballerIds, type CellPosition, type Side } from '@sportapps/game-core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/action-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing, type ThemeColor } from '@/constants/theme';
import type { HeaderView } from '@/data/types';
import { Board } from '@/features/match/board';
import { DIFFICULTY_LABELS, parseDifficulty } from '@/features/match/difficulty';
import { FootballerSearch } from '@/features/match/footballer-search';
import type { Feedback } from '@/features/match/session';
import { BOT_SIDE, useMatch, type MatchMode } from '@/features/match/use-match';
import { useTheme } from '@/hooks/use-theme';

const URGENT_SECONDS = 5;

const FEEDBACK_COLORS: Record<Feedback['kind'], ThemeColor> = {
  correct: 'positive',
  wrong: 'negative',
  'already-used': 'negative',
  timeout: 'textSecondary',
  'bot-passed': 'textSecondary',
};

export default function MatchScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; difficulty?: string }>();
  const mode: MatchMode = params.mode === 'bot' ? 'bot' : 'local';
  const difficulty = parseDifficulty(params.difficulty);
  const { unavailable, setup, session, secondsLeft, canPlay, answer, restart } = useMatch(mode, difficulty);
  const [selection, setSelection] = useState<{ turnNumber: number; position: CellPosition } | null>(null);

  if (unavailable || !setup || !session) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centeredContent]}>
          <ThemedText themeColor="textSecondary">{t(unavailable ? 'match.unavailable' : 'match.loading')}</ThemedText>
          {unavailable ? <ActionButton label={t('match.home')} onPress={() => router.back()} variant="secondary" /> : null}
        </SafeAreaView>
      </ThemedView>
    );
  }

  const { match, feedback } = session;
  const { gridView, market } = setup;
  const selected = selection && selection.turnNumber === match.turnNumber && canPlay ? selection.position : null;

  const sideName = (side: Side) => {
    if (mode === 'bot') {
      return side === BOT_SIDE ? t('match.bot') : t('match.you');
    }
    return side === 'x' ? t('match.sideX') : t('match.sideO');
  };

  const feedbackText = (current: Feedback) => {
    const name = current.footballerName ?? '';
    switch (current.kind) {
      case 'correct':
        return t('match.correct', { name });
      case 'wrong':
        return t('match.wrong', { name });
      case 'already-used':
        return t('match.alreadyUsed', { name });
      case 'timeout':
        return t('match.timeout');
      case 'bot-passed':
        return t('match.botPassed');
    }
  };

  const score = (side: Side) => (
    <View
      style={[
        styles.score,
        { borderColor: !match.result && match.turn === side ? (side === 'x' ? theme.sideX : theme.sideO) : 'transparent' },
      ]}>
      <View style={[styles.dot, { backgroundColor: side === 'x' ? theme.sideX : theme.sideO }]} />
      <ThemedText type="smallBold" numberOfLines={1} style={styles.scoreName}>
        {sideName(side)}
      </ThemedText>
      <ThemedText type="smallBold">{countCells(match, side)}</ThemedText>
    </View>
  );

  const selectedTitle = selected
    ? `${(gridView.rows[selected.row] as HeaderView).name} × ${(gridView.columns[selected.column] as HeaderView).name}`
    : '';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={Spacing.three}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('match.quit')}
            </ThemedText>
          </Pressable>
          <ThemedText type="small" themeColor="textSecondary">
            {t(DIFFICULTY_LABELS[difficulty])}
          </ThemedText>
        </View>

        <View style={styles.scores}>
          {score('x')}
          {score('o')}
        </View>

        <Board
          gridView={gridView}
          session={session}
          disabled={!canPlay}
          onSelectCell={(position) => setSelection({ turnNumber: match.turnNumber, position })}
        />

        <View style={styles.status}>
          {match.result ? (
            <>
              <ThemedText type="subtitle" style={styles.centered}>
                {match.result.winner ? t('match.winner', { name: sideName(match.result.winner) }) : t('match.draw')}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {match.result.reason === 'line'
                  ? t('match.byLine')
                  : t('match.byCells', { x: countCells(match, 'x'), o: countCells(match, 'o') })}
              </ThemedText>
              <ActionButton label={t('match.playAgain')} onPress={restart} />
              <ActionButton label={t('match.home')} onPress={() => router.back()} variant="secondary" />
            </>
          ) : (
            <>
              <ThemedText type="smallBold">{t('match.turn', { name: sideName(match.turn) })}</ThemedText>
              <ThemedText type="subtitle" themeColor={secondsLeft <= URGENT_SECONDS ? 'negative' : 'text'}>
                {t('match.secondsLeft', { seconds: secondsLeft })}
              </ThemedText>
            </>
          )}
          {feedback ? (
            <ThemedText type="small" themeColor={FEEDBACK_COLORS[feedback.kind]} style={styles.centered}>
              {feedbackText(feedback)}
            </ThemedText>
          ) : null}
        </View>
      </SafeAreaView>

      {selected ? (
        <FootballerSearch
          title={selectedTitle}
          market={market.code}
          secondsLeft={secondsLeft}
          excludedIds={usedFootballerIds(match)}
          onClose={() => setSelection(null)}
          onSelect={(footballer) => {
            setSelection(null);
            void answer(selected, footballer);
          }}
        />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    maxWidth: MaxContentWidth,
  },
  centeredContent: {
    justifyContent: 'center',
  },
  topBar: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  scores: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  score: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 2,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  scoreName: {
    flex: 1,
  },
  dot: {
    width: Spacing.three,
    height: Spacing.three,
    borderRadius: Spacing.two,
  },
  status: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: Spacing.two,
  },
  centered: {
    textAlign: 'center',
  },
});
