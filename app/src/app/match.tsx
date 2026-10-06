import { countCells, usedFootballerIds, type CellPosition, type Side } from '@sportapps/game-core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, ZoomIn } from 'react-native-reanimated';

import { ActionButton } from '@/components/action-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, MinimumTouchSize, Motion, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import type { HeaderView } from '@/data/types';
import { Board } from '@/features/match/board';
import { DIFFICULTY_LABELS, parseDifficulty } from '@/features/match/difficulty';
import { FootballerSearch } from '@/features/match/footballer-search';
import { Scoreboard } from '@/features/match/scoreboard';
import type { Feedback } from '@/features/match/session';
import { TurnTimer } from '@/features/match/turn-timer';
import { BOT_SIDE, useMatch, type MatchMode } from '@/features/match/use-match';
import { URGENT_SECONDS, useMatchEffects } from '@/features/match/use-match-effects';
import { WinBurst } from '@/features/match/win-burst';
import { useUppercase } from '@/i18n/uppercase';

const SIDE_COLORS: Record<Side, string> = { x: Colors.sideX, o: Colors.sideO };

const FEEDBACK_COLORS: Record<Feedback['kind'], ThemeColor> = {
  correct: 'positive',
  wrong: 'negative',
  'already-used': 'negative',
  timeout: 'gold',
  'bot-passed': 'gold',
};

export default function MatchScreen() {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; difficulty?: string }>();
  const mode: MatchMode = params.mode === 'bot' ? 'bot' : 'local';
  const difficulty = parseDifficulty(params.difficulty);
  const { unavailable, setup, session, secondsLeft, canPlay, answer, restart } = useMatch(mode, difficulty);
  const [selection, setSelection] = useState<{ turnNumber: number; position: CellPosition } | null>(null);
  const opponentSide = mode === 'bot' ? BOT_SIDE : null;

  useMatchEffects(session, secondsLeft, opponentSide);

  if (unavailable || !setup || !session) {
    return (
      <Screen contentStyle={styles.centeredContent}>
        <ThemedText type="label" themeColor="textSecondary">
          {uppercase(t(unavailable ? 'match.unavailable' : 'match.loading'))}
        </ThemedText>
        {unavailable ? <ActionButton label={t('match.home')} onPress={() => router.back()} variant="secondary" /> : null}
      </Screen>
    );
  }

  const { match, feedback } = session;
  const { gridView, market } = setup;
  const { result } = match;
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

  const urgent = !result && secondsLeft <= URGENT_SECONDS;
  const celebrate = result !== null && result.winner !== null && result.winner !== opponentSide;
  const selectedTitle = selected
    ? `${(gridView.rows[selected.row] as HeaderView).name} × ${(gridView.columns[selected.column] as HeaderView).name}`
    : '';

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.quit} hitSlop={Spacing.two}>
          <ThemedText type="label" themeColor="textSecondary">
            {uppercase(t('match.quit'))}
          </ThemedText>
        </Pressable>
        <ThemedText type="label" themeColor="textSecondary">
          {uppercase(t(DIFFICULTY_LABELS[difficulty]))}
        </ThemedText>
      </View>

      <Scoreboard
        names={{ x: sideName('x'), o: sideName('o') }}
        scores={{ x: countCells(match, 'x'), o: countCells(match, 'o') }}
        activeSide={result ? null : match.turn}
        center={
          <TurnTimer
            turnEndsAt={session.turnEndsAt}
            totalSeconds={match.rules.turnSeconds}
            secondsLeft={result ? 0 : secondsLeft}
            color={urgent ? Colors.negative : result ? Colors.border : SIDE_COLORS[match.turn]}
            running={!result}
            accessibilityLabel={t('match.secondsLeft', { seconds: secondsLeft })}
          />
        }
      />

      <Board
        gridView={gridView}
        session={session}
        disabled={!canPlay}
        onSelectCell={(position) => setSelection({ turnNumber: match.turnNumber, position })}
      />

      <View style={styles.status}>
        {result ? (
          <Animated.View entering={ZoomIn.springify().damping(13)} style={styles.result}>
            <ThemedText type="title" themeColor={result.winner ? 'gold' : 'floodlight'} style={styles.centered}>
              {uppercase(result.winner ? t('match.winner', { name: sideName(result.winner) }) : t('match.draw'))}
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              {result.reason === 'line'
                ? t('match.byLine')
                : t('match.byCells', { x: countCells(match, 'x'), o: countCells(match, 'o') })}
            </ThemedText>
            <ActionButton label={t('match.playAgain')} onPress={restart} />
            <ActionButton label={t('match.home')} onPress={() => router.back()} variant="secondary" />
          </Animated.View>
        ) : (
          <ThemedText type="subtitle" style={[styles.centered, { color: SIDE_COLORS[match.turn] }]}>
            {uppercase(t('match.turn', { name: sideName(match.turn) }))}
          </ThemedText>
        )}
        {feedback && !result ? (
          <Animated.View
            key={match.turnNumber}
            entering={FadeInDown.duration(Motion.base)}
            exiting={FadeOut.duration(Motion.quick)}
            accessibilityLiveRegion="polite"
            style={[styles.feedback, { borderColor: Colors[FEEDBACK_COLORS[feedback.kind]] }]}>
            <ThemedText type="smallBold" themeColor={FEEDBACK_COLORS[feedback.kind]} style={styles.centered}>
              {feedbackText(feedback)}
            </ThemedText>
          </Animated.View>
        ) : null}
      </View>

      {celebrate ? (
        <Animated.View entering={FadeIn.duration(Motion.quick)} style={StyleSheet.absoluteFill} pointerEvents="none">
          <WinBurst />
        </Animated.View>
      ) : null}

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  centeredContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  topBar: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quit: {
    minHeight: MinimumTouchSize,
    justifyContent: 'center',
  },
  status: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: Spacing.two,
  },
  result: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: Spacing.two,
  },
  feedback: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  centered: {
    textAlign: 'center',
  },
});
