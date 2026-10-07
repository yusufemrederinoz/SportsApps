import { opponentOf, type Side } from '@sportapps/game-core';
import { DUEL_PLAY_SECONDS, type DuelAction, type DuelConcept } from '@sportapps/protocol';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { MetalPlate } from '@/components/metal-plate';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MaxContentWidth, MinimumTouchSize, Motion, Radius, Spacing } from '@/constants/theme';
import { loadConceptLabel } from '@/data/queries';
import type { ConceptLabel } from '@/data/types';
import { JokerBar } from '@/features/jokers/joker-bar';
import { ResultOverlay } from '@/features/match/result-overlay';
import { Scoreboard } from '@/features/match/scoreboard';
import { TurnTimer } from '@/features/match/turn-timer';
import { URGENT_SECONDS } from '@/features/match/use-match-effects';
import type { OnlineDuel } from '@/features/match/use-online-match';
import { useNameUppercase, useUppercase } from '@/i18n/uppercase';

import { DuelTable } from './duel-table';
import { HandPicker, LockedHand } from './hand-picker';
import { QUESTION_KEYS, conceptTitle } from './labels';
import { useDuelEffects } from './use-duel-effects';

const HAND_COLUMNS = 4;
const HAND_HEIGHT_SHARE = 0.105;
const ARENA_HEIGHT_SHARE = 0.165;
const ARENA_GUTTER = 72;
const MAXIMUM_CARD_SIZE = 132;

interface DuelMatchViewProps {
  duel: OnlineDuel;
  secondsLeft: number;
  canAct: boolean;
  notice: string | null;
  playAgainLabel: string;
  onAct: (action: DuelAction) => void;
  onPlayAgain: () => void;
  onQuit: () => void;
}

function useConceptLabel(concept: DuelConcept, market: string): ConceptLabel | null {
  const database = useSQLiteContext();
  const { i18n } = useTranslation();
  const language = i18n.language;
  const key = JSON.stringify(concept);
  const [loaded, setLoaded] = useState<{ key: string; label: ConceptLabel } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadConceptLabel(database, JSON.parse(key) as DuelConcept, market, language).then((label) => {
      if (!cancelled) {
        setLoaded({ key, label });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [database, key, market, language]);

  return loaded?.key === key ? loaded.label : null;
}

export function DuelMatchView({
  duel,
  secondsLeft,
  canAct,
  notice,
  playAgainLabel,
  onAct,
  onPlayAgain,
  onQuit,
}: DuelMatchViewProps) {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const nameUppercase = useNameUppercase();
  const { width, height } = useWindowDimensions();
  const { view, side } = duel;
  const rival = opponentOf(side);
  const label = useConceptLabel(view.concept, duel.market.code);

  useDuelEffects(view, side, secondsLeft);

  const contentWidth = Math.min(width, MaxContentWidth) - Spacing.three * 2;
  const handCardSize = Math.floor(
    Math.min((contentWidth - Spacing.two * (HAND_COLUMNS - 1)) / HAND_COLUMNS, height * HAND_HEIGHT_SHARE, MAXIMUM_CARD_SIZE),
  );
  const arenaSize = Math.floor(Math.min((contentWidth - ARENA_GUTTER) / 2, height * ARENA_HEIGHT_SHARE));
  const pickCardSize = Math.floor(
    Math.min((contentWidth - Spacing.two * (HAND_COLUMNS - 1)) / HAND_COLUMNS, height * 0.13, MAXIMUM_CARD_SIZE),
  );

  const names = { [side]: t('match.you'), [rival]: duel.usernames[rival] } as Record<Side, string>;
  const { result } = view;
  const picking = view.phase === 'picking';
  const title = label ? conceptTitle(t, view.concept, label, { uppercase, nameUppercase }) : '';
  const lastRound = view.rounds.at(-1) ?? null;
  const roundNumber = view.phase === 'playing' ? view.rounds.length + 1 : view.rounds.length;
  const question = view.question ?? lastRound;
  const running = view.phase === 'playing';
  const waitingOnPlayer = picking ? view.hand === null : running && view.played === null;
  const urgent = waitingOnPlayer && secondsLeft <= URGENT_SECONDS;
  const activeSide: Side | null = running
    ? view.played === null
      ? side
      : view.opponentPlayed
        ? null
        : rival
    : view.phase === 'reveal'
      ? (lastRound?.winner ?? null)
      : null;
  const won = result?.winner === side;
  const resultDetail =
    result?.reason === 'forfeit' ? t(won ? 'match.byForfeitWin' : 'match.byForfeitLoss') : t('duel.byScore');

  return (
    <Screen
      contentStyle={styles.content}
      overlay={
        result ? (
          <ResultOverlay
            title={!result.winner ? t('match.draw') : t(won ? 'match.youWin' : 'match.youLose')}
            detail={resultDetail}
            score={`${view.scores.x} – ${view.scores.o}`}
            tone={!result.winner ? 'draw' : won ? 'win' : 'loss'}
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
            {uppercase(picking ? t('games.duel') : t('duel.round', { round: roundNumber, total: view.totalRounds }))}
          </ThemedText>
        </View>
      </Animated.View>

      {picking ? (
        <Animated.View entering={FadeInDown.duration(Motion.slow)} style={styles.stretch}>
          <MetalPlate finish={null} cut="right" cutSize={20} radius={14} style={styles.plate}>
            <View style={styles.conceptRow}>
              <View style={styles.conceptTexts}>
                <ThemedText type="label" themeColor="volt">
                  {uppercase(t('duel.conceptLabel'))}
                </ThemedText>
                <ThemedText style={styles.plateTitle} accessibilityRole="header" numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {title}
                </ThemedText>
              </View>
              <View
                style={[styles.clock, urgent && styles.clockUrgent]}
                accessible
                accessibilityRole="timer"
                accessibilityLabel={t('match.secondsLeft', { seconds: secondsLeft })}>
                <ThemedText type="score" style={[styles.clockText, { color: urgent ? Colors.negative : Colors.volt }]}>
                  {secondsLeft}
                </ThemedText>
              </View>
            </View>
          </MetalPlate>
        </Animated.View>
      ) : (
        <>
          <Animated.View entering={FadeInDown.duration(Motion.slow)} style={styles.stretch}>
            <Scoreboard
              names={names}
              scores={view.scores}
              activeSide={activeSide}
              center={
                <TurnTimer
                  turnEndsAt={duel.deadlineAt}
                  totalSeconds={DUEL_PLAY_SECONDS}
                  secondsLeft={running ? secondsLeft : 0}
                  color={urgent ? Colors.negative : running ? Colors.volt : Colors.strokeBright}
                  running={running}
                  urgent={urgent}
                  accessibilityLabel={t('match.secondsLeft', { seconds: secondsLeft })}
                />
              }
            />
          </Animated.View>
          <Animated.View key={roundNumber} entering={FadeInDown.duration(Motion.slow)} style={styles.stretch}>
            <MetalPlate finish={null} cut="right" cutSize={20} radius={14} style={styles.plate}>
              <ThemedText
                style={[styles.plateTitle, styles.question]}
                accessibilityRole="header"
                accessibilityLiveRegion="polite"
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.7}>
                {question ? uppercase(t(QUESTION_KEYS[question.metric])) : ''}
              </ThemedText>
            </MetalPlate>
          </Animated.View>
        </>
      )}

      {notice && !result ? (
        <ThemedText type="small" themeColor="gold" style={styles.notice} accessibilityLiveRegion="polite">
          {notice}
        </ThemedText>
      ) : null}

      {!picking ? (
        <DuelTable
          view={view}
          side={side}
          cards={duel.cards}
          canAct={canAct}
          arenaSize={arenaSize}
          handCardSize={handCardSize}
          jokers={(selected) => (
            <JokerBar
              scope={view.rounds.length}
              available={() => view.phase === 'playing' && view.played === null}
              target={(joker) => (joker !== 'swap-card' ? {} : selected === null ? null : { footballerId: selected })}
              metric={view.question?.metric ?? null}
            />
          )}
          onPlay={(footballerId) => onAct({ kind: 'play', footballerId })}
        />
      ) : view.hand ? (
        <LockedHand
          hand={view.hand}
          cards={duel.cards}
          side={side}
          cardSize={pickCardSize}
          opponentReady={view.opponentReady}
        />
      ) : (
        <HandPicker
          title={title}
          marketCode={duel.market.code}
          concept={view.concept}
          side={side}
          handSize={view.handSize}
          cardSize={pickCardSize}
          secondsLeft={secondsLeft}
          canAct={canAct}
          onLock={(footballerIds) => onAct({ kind: 'hand', footballerIds })}
        />
      )}
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
  plate: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    minHeight: 68,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  plateTitle: {
    fontFamily: Fonts.display,
    fontSize: 24,
    lineHeight: 26,
    color: Colors.text,
  },
  question: {
    textAlign: 'center',
  },
  conceptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  conceptTexts: {
    flex: 1,
    gap: Spacing.half,
  },
  clock: {
    minWidth: 64,
    alignItems: 'stretch',
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
    textAlign: 'center',
  },
  notice: {
    alignSelf: 'stretch',
    textAlign: 'center',
  },
});
