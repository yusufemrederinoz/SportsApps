import { countCells, usedFootballerIds, type CellPosition, type Side } from '@sportapps/game-core';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Finishes, MinimumTouchSize, Motion, Spacing } from '@/constants/theme';
import type { FootballerSummary, GridView, HeaderView } from '@/data/types';
import { useNameUppercase, useUppercase } from '@/i18n/uppercase';

import { Board } from './board';
import { FeedbackStamp } from './feedback-stamp';
import { FootballerSearch } from './footballer-search';
import { ResultOverlay } from './result-overlay';
import { Scoreboard } from './scoreboard';
import type { MatchSession } from './session';
import { TurnTimer } from './turn-timer';
import { URGENT_SECONDS, useMatchEffects } from './use-match-effects';

interface MatchViewProps {
  gridView: GridView;
  marketCode: string;
  session: MatchSession;
  secondsLeft: number;
  canPlay: boolean;
  names: Record<Side, string>;
  opponentSide: Side;
  tag: string;
  turnLabel: string;
  resultTitle: string;
  resultDetail: string;
  playAgainLabel: string;
  notice?: string | null;
  searchFooter?: (cell: CellPosition) => ReactNode;
  onAnswer: (position: CellPosition, footballer: FootballerSummary) => void;
  onPlayAgain: () => void;
  onQuit: () => void;
}

export function MatchView({
  gridView,
  marketCode,
  session,
  secondsLeft,
  canPlay,
  names,
  opponentSide,
  tag,
  turnLabel,
  resultTitle,
  resultDetail,
  playAgainLabel,
  notice = null,
  searchFooter,
  onAnswer,
  onPlayAgain,
  onQuit,
}: MatchViewProps) {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const nameUppercase = useNameUppercase();
  const [selection, setSelection] = useState<{ turnNumber: number; position: CellPosition } | null>(null);

  useMatchEffects(session, secondsLeft, opponentSide);

  const { match, feedback } = session;
  const { result } = match;
  const selected = selection && selection.turnNumber === match.turnNumber && canPlay ? selection.position : null;
  const urgent = !result && secondsLeft <= URGENT_SECONDS;
  const scores = { x: countCells(match, 'x'), o: countCells(match, 'o') };
  const resultTone = !result?.winner ? 'draw' : result.winner === opponentSide ? 'loss' : 'win';
  const headerTitle = (header: HeaderView) => nameUppercase(header.name, header.local);
  const selectedTitle = selected
    ? `${headerTitle(gridView.rows[selected.row] as HeaderView)} × ${headerTitle(gridView.columns[selected.column] as HeaderView)}`
    : '';

  return (
    <Screen
      contentStyle={styles.content}
      overlay={
        result ? (
          <ResultOverlay
            title={resultTitle}
            detail={resultDetail}
            score={`${scores.x} – ${scores.o}`}
            tone={resultTone}
            playAgainLabel={playAgainLabel}
            homeLabel={t('match.home')}
            onPlayAgain={onPlayAgain}
            onHome={onQuit}
          />
        ) : null
      }>
      <Animated.View entering={FadeIn.duration(Motion.base)} style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={onQuit} style={styles.quit} hitSlop={Spacing.two}>
          <ThemedText type="label" themeColor="textSecondary">
            {`‹ ${uppercase(t('match.quit'))}`}
          </ThemedText>
        </Pressable>
        <View style={styles.tag}>
          <ThemedText type="label" themeColor="onAccent">
            {uppercase(tag)}
          </ThemedText>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(Motion.slow)} style={styles.stretch}>
        <Scoreboard
          names={names}
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
          <FeedbackStamp key={match.turnNumber} feedback={feedback} homeCountryCode={marketCode.toUpperCase()} />
        ) : !result ? (
          <ThemedText type="subtitle" style={[styles.turn, { color: Finishes[match.turn].base }]}>
            {uppercase(turnLabel)}
          </ThemedText>
        ) : null}
        {notice && !result ? (
          <ThemedText type="small" themeColor="gold" style={styles.notice} accessibilityLiveRegion="polite">
            {notice}
          </ThemedText>
        ) : null}
      </View>

      {selected ? (
        <FootballerSearch
          title={selectedTitle}
          market={marketCode}
          secondsLeft={secondsLeft}
          excludedIds={usedFootballerIds(match)}
          footer={searchFooter ? searchFooter(selected) : undefined}
          onClose={() => setSelection(null)}
          onSelect={(footballer) => {
            setSelection(null);
            onAnswer(selected, footballer);
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
  tag: {
    backgroundColor: Colors.volt,
    borderRadius: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  status: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 80,
  },
  turn: {
    textAlign: 'center',
  },
  notice: {
    textAlign: 'center',
  },
});
