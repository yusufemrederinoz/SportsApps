import { countCells, usedFootballerIds, type CellPosition, type Side } from '@sportapps/game-core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ActionButton } from '@/components/action-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Finishes, MinimumTouchSize, Motion, Spacing } from '@/constants/theme';
import type { HeaderView } from '@/data/types';
import { Board } from '@/features/match/board';
import { DIFFICULTY_LABELS, parseDifficulty } from '@/features/match/difficulty';
import { FeedbackStamp } from '@/features/match/feedback-stamp';
import { FootballerSearch } from '@/features/match/footballer-search';
import { ResultOverlay } from '@/features/match/result-overlay';
import { Scoreboard } from '@/features/match/scoreboard';
import { TurnTimer } from '@/features/match/turn-timer';
import { BOT_SIDE, useMatch, type MatchMode } from '@/features/match/use-match';
import { URGENT_SECONDS, useMatchEffects } from '@/features/match/use-match-effects';
import { useUppercase } from '@/i18n/uppercase';

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
  const urgent = !result && secondsLeft <= URGENT_SECONDS;
  const scores = { x: countCells(match, 'x'), o: countCells(match, 'o') };

  const sideName = (side: Side) => {
    if (mode === 'bot') {
      return side === BOT_SIDE ? t('match.bot') : t('match.you');
    }
    return side === 'x' ? t('match.sideX') : t('match.sideO');
  };

  const resultTitle = () => {
    if (!result?.winner) {
      return t('match.draw');
    }
    if (mode === 'bot') {
      return result.winner === BOT_SIDE ? t('match.youLose') : t('match.youWin');
    }
    return t('match.winner', { name: sideName(result.winner) });
  };

  const resultTone = !result?.winner ? 'draw' : result.winner === opponentSide ? 'loss' : 'win';
  const selectedTitle = selected
    ? `${(gridView.rows[selected.row] as HeaderView).name} × ${(gridView.columns[selected.column] as HeaderView).name}`
    : '';

  return (
    <Screen
      contentStyle={styles.content}
      overlay={
        result ? (
          <ResultOverlay
            title={resultTitle()}
            detail={result.reason === 'line' ? t('match.byLine') : t('match.byCells')}
            score={`${scores.x} – ${scores.o}`}
            tone={resultTone}
            playAgainLabel={t('match.playAgain')}
            homeLabel={t('match.home')}
            onPlayAgain={restart}
            onHome={() => router.back()}
          />
        ) : null
      }>
      <Animated.View entering={FadeIn.duration(Motion.base)} style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.quit} hitSlop={Spacing.two}>
          <ThemedText type="label" themeColor="textSecondary">
            {`‹ ${uppercase(t('match.quit'))}`}
          </ThemedText>
        </Pressable>
        <View style={styles.difficultyTag}>
          <ThemedText type="label" themeColor="onAccent">
            {uppercase(t(DIFFICULTY_LABELS[difficulty]))}
          </ThemedText>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(Motion.slow)} style={styles.stretch}>
        <Scoreboard
          names={{ x: sideName('x'), o: sideName('o') }}
          scores={scores}
          activeSide={result ? null : match.turn}
          center={
            <TurnTimer
              turnEndsAt={session.turnEndsAt}
              totalSeconds={match.rules.turnSeconds}
              secondsLeft={result ? 0 : secondsLeft}
              color={urgent ? Colors.negative : result ? Colors.strokeBright : Finishes[match.turn].base}
              running={!result}
              urgent={urgent}
              accessibilityLabel={t('match.secondsLeft', { seconds: secondsLeft })}
            />
          }
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(Motion.slow).delay(120)} style={styles.stretch}>
        <Board
          gridView={gridView}
          session={session}
          disabled={!canPlay}
          selected={selected}
          onSelectCell={(position) => setSelection({ turnNumber: match.turnNumber, position })}
        />
      </Animated.View>

      <View style={styles.status}>
        {feedback && !result ? (
          <FeedbackStamp key={match.turnNumber} feedback={feedback} />
        ) : !result ? (
          <ThemedText type="subtitle" style={{ color: Finishes[match.turn].base }}>
            {uppercase(t('match.turn', { name: sideName(match.turn) }))}
          </ThemedText>
        ) : null}
      </View>

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
  stretch: {
    alignSelf: 'stretch',
    alignItems: 'center',
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
  difficultyTag: {
    backgroundColor: Colors.volt,
    borderRadius: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  status: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
});
