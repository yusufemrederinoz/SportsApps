import { opponentOf, type Side } from '@sportapps/game-core';
import { RARE_ANSWER_SECONDS, type RareAction, type RareAnswerView, type RareCriteriaView } from '@sportapps/protocol';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ActionButton } from '@/components/action-button';
import { MetalPlate } from '@/components/metal-plate';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Finishes, Fonts, MaxContentWidth, MinimumTouchSize, Motion, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { loadHeaderLabel } from '@/data/queries';
import type { HeaderView } from '@/data/types';
import { EmptySlot } from '@/features/duel/card-back';
import { JokerBar } from '@/features/jokers/joker-bar';
import { flagEmoji } from '@/features/match/flags';
import { FootballerCard } from '@/features/match/footballer-card';
import { FootballerSearch } from '@/features/match/footballer-search';
import { ResultOverlay } from '@/features/match/result-overlay';
import { Scoreboard } from '@/features/match/scoreboard';
import { ownScoreFirst, ownSideFirst } from '@/features/match/sides';
import { TurnTimer } from '@/features/match/turn-timer';
import { URGENT_SECONDS } from '@/features/match/use-match-effects';
import type { OnlineRare } from '@/features/match/use-online-match';
import { haptics } from '@/feedback/haptics';
import { playSound } from '@/feedback/sounds';
import { useNameUppercase, useUppercase } from '@/i18n/uppercase';

const FAME_BAR_WIDTH = 96;
const MAXIMUM_FAME = 100;
const PIP_SIZE = 12;

interface RareMatchViewProps {
  rare: OnlineRare;
  secondsLeft: number;
  canAct: boolean;
  notice: string | null;
  playAgainLabel: string;
  onAct: (action: RareAction) => void;
  onPlayAgain: () => void;
  onQuit: () => void;
}

export function useCriteriaLabels(criteria: RareCriteriaView | null, market: string): [HeaderView, HeaderView] | null {
  const database = useSQLiteContext();
  const { i18n } = useTranslation();
  const language = i18n.language;
  const key = criteria ? JSON.stringify(criteria) : '';
  const [loaded, setLoaded] = useState<{ key: string; labels: [HeaderView, HeaderView] } | null>(null);

  useEffect(() => {
    if (!key) {
      return;
    }
    const parsed = JSON.parse(key) as RareCriteriaView;
    let cancelled = false;
    void Promise.all([
      loadHeaderLabel(database, parsed.row, market, language),
      loadHeaderLabel(database, parsed.column, market, language),
    ]).then((labels) => {
      if (!cancelled) {
        setLoaded({ key, labels });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [database, key, market, language]);

  return loaded?.key === key ? loaded.labels : null;
}

function useRareEffects(rare: OnlineRare, secondsLeft: number) {
  const { view, side } = rare;
  const rounds = view.rounds.length;
  const lastWinner = view.rounds.at(-1)?.winner ?? null;
  const rivalAnswered = view.answered[opponentOf(side)];
  const waiting = view.phase === 'answering' && view.own === null;

  useEffect(() => {
    playSound('whistle');
  }, []);

  useEffect(() => {
    if (rivalAnswered) {
      haptics.tick();
    }
  }, [rivalAnswered]);

  useEffect(() => {
    if (rounds === 0) {
      return;
    }
    playSound('impact');
    if (lastWinner === side) {
      haptics.success();
      playSound('correct');
    } else if (lastWinner !== null) {
      haptics.error();
      playSound('wrong');
    } else {
      haptics.warning();
    }
  }, [rounds, lastWinner, side]);

  useEffect(() => {
    if (!view.result) {
      return;
    }
    if (view.result.winner === side) {
      haptics.celebrate();
      playSound('win');
    } else {
      playSound('whistle');
    }
  }, [view.result, side]);

  useEffect(() => {
    if (waiting && secondsLeft > 0 && secondsLeft <= URGENT_SECONDS) {
      haptics.tick();
      playSound('tick');
    }
  }, [waiting, secondsLeft]);
}

interface AnswerColumnProps {
  answer: RareAnswerView;
  side: Side;
  name: string;
  winner: boolean;
  loser: boolean;
  size: number;
  footballer: Parameters<typeof FootballerCard>[0]['footballer'];
}

function AnswerColumn({ answer, side, name, winner, loser, size, footballer }: AnswerColumnProps) {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const verdict = answer.footballerId === null ? t('rare.noAnswer') : answer.correct ? t('rare.right') : t('rare.wrong');
  const fame = answer.fame ?? 0;
  return (
    <View style={[styles.column, { width: size }]}>
      <ThemedText type="label" style={{ color: Finishes[side].base }} numberOfLines={1}>
        {uppercase(name)}
      </ThemedText>
      {answer.footballerId === null ? (
        <EmptySlot size={size} color={Finishes[side].base} waiting={false} accessibilityLabel={verdict} />
      ) : (
        <FootballerCard
          footballer={footballer}
          side={side}
          size={size}
          emphasis={winner ? 'winner' : loser ? 'dimmed' : 'none'}
          watermark={false}
        />
      )}
      <ThemedText type="smallBold" themeColor={answer.correct ? 'positive' : 'negative'} style={styles.centered}>
        {uppercase(verdict)}
      </ThemedText>
      {answer.correct ? (
        <View style={styles.fame} accessible accessibilityLabel={t('rare.fame', { fame })}>
          <View style={styles.fameTrack}>
            <View style={[styles.fameFill, { width: (FAME_BAR_WIDTH * Math.min(fame, MAXIMUM_FAME)) / MAXIMUM_FAME, backgroundColor: Finishes[side].base }]} />
          </View>
          <ThemedText type="label" themeColor="textSecondary">
            {t('rare.fame', { fame })}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

export function RareMatchView({
  rare,
  secondsLeft,
  canAct,
  notice,
  playAgainLabel,
  onAct,
  onPlayAgain,
  onQuit,
}: RareMatchViewProps) {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const nameUppercase = useNameUppercase();
  const { width, height } = useWindowDimensions();
  const [searching, setSearching] = useState<number | null>(null);
  const { view, side } = rare;
  const rival = opponentOf(side);
  const lastRound = view.rounds.at(-1) ?? null;
  const shownCriteria = view.criteria ?? lastRound?.criteria ?? null;
  const labels = useCriteriaLabels(shownCriteria, rare.market.code);

  useRareEffects(rare, secondsLeft);

  const { result } = view;
  const answering = view.phase === 'answering';
  const canName = answering && view.own === null && canAct;
  const urgent = answering && view.own === null && secondsLeft <= URGENT_SECONDS;
  const contentWidth = Math.min(width, MaxContentWidth) - Spacing.three * 2;
  const revealSize = Math.floor(Math.min((contentWidth - Spacing.three) / 2, height * 0.17));
  const ownSize = Math.floor(Math.min(contentWidth * 0.45, height * 0.2));
  const names = { [side]: t('match.you'), [rival]: rare.usernames[rival] } as Record<Side, string>;
  const won = result?.winner === side;
  const title = labels
    ? labels
        .map((label) => `${flagEmoji(label.countryCode) ?? ''} ${nameUppercase(label.name, label.local)}`.trim())
        .join('  ×  ')
    : '';

  const status = (): { text: string; color: ThemeColor } => {
    if (!answering && lastRound) {
      if (lastRound.winner === null) {
        return { text: t('rare.roundDrawn'), color: 'gold' };
      }
      return lastRound.winner === side
        ? { text: t('rare.roundWon'), color: 'positive' }
        : { text: t('rare.roundLost'), color: 'negative' };
    }
    if (view.own === null) {
      return { text: t('rare.hint'), color: 'volt' };
    }
    return view.answered[rival]
      ? { text: t('rare.bothAnswered'), color: 'gold' }
      : { text: t('rare.waitingOpponent'), color: 'textSecondary' };
  };
  const current = status();

  return (
    <Screen
      contentStyle={styles.content}
      overlay={
        result ? (
          <ResultOverlay
            title={!result.winner ? t('match.draw') : t(won ? 'match.youWin' : 'match.youLose')}
            detail={result.reason === 'forfeit' ? t(won ? 'match.byForfeitWin' : 'match.byForfeitLoss') : t('rare.byScore')}
            score={ownScoreFirst(view.scores, side)}
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
            {uppercase(t('rare.round', { round: view.round, total: view.totalRounds }))}
          </ThemedText>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(Motion.slow)} style={styles.stretch}>
        <Scoreboard
          side={side}
          names={names}
          scores={view.scores}
          activeSide={null}
          center={
            <TurnTimer
              key={`${view.round}-${view.phase}`}
              turnEndsAt={rare.deadlineAt}
              totalSeconds={RARE_ANSWER_SECONDS}
              secondsLeft={answering ? secondsLeft : 0}
              color={urgent ? Colors.negative : answering ? Colors.volt : Colors.strokeBright}
              running={answering}
              urgent={urgent}
              accessibilityLabel={t('match.secondsLeft', { seconds: secondsLeft })}
            />
          }
        />
      </Animated.View>

      <JokerBar scope={view.round} available={() => answering && !view.answered[side]} />

      <Animated.View key={view.round} entering={FadeInDown.duration(Motion.slow)} style={styles.stretch}>
        <MetalPlate finish={null} cut="right" cutSize={20} radius={14} style={styles.plate}>
          <ThemedText type="label" themeColor="volt">
            {uppercase(t('rare.criteria'))}
          </ThemedText>
          <ThemedText style={styles.criteria} accessibilityRole="header" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
            {title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('rare.rule')}
          </ThemedText>
        </MetalPlate>
      </Animated.View>

      <View style={styles.pips} accessible accessibilityLabel={t('rare.round', { round: view.round, total: view.totalRounds })}>
        {Array.from({ length: view.totalRounds }, (_, index) => {
          const winner = view.rounds[index]?.winner ?? null;
          return (
            <View
              key={index}
              style={[
                styles.pip,
                winner && { backgroundColor: Finishes[winner].base, borderColor: Finishes[winner].light },
                !winner && view.rounds[index] && styles.pipDrawn,
              ]}
            />
          );
        })}
      </View>

      <View style={styles.middle}>
        {!answering && lastRound ? (
          <View style={styles.reveal}>
            {ownSideFirst(side).map((answerSide) => (
              <AnswerColumn
                key={`${view.rounds.length}-${answerSide}`}
                answer={lastRound.answers[answerSide]}
                side={answerSide}
                name={names[answerSide]}
                winner={lastRound.winner === answerSide}
                loser={lastRound.winner !== null && lastRound.winner !== answerSide}
                size={revealSize}
                footballer={
                  lastRound.answers[answerSide].footballerId === null
                    ? null
                    : (rare.cards[lastRound.answers[answerSide].footballerId as number] ?? null)
                }
              />
            ))}
          </View>
        ) : view.own !== null ? (
          <Animated.View entering={FadeIn.duration(Motion.base)} style={styles.own}>
            <FootballerCard footballer={rare.cards[view.own] ?? null} side={side} size={ownSize} emphasis="none" watermark={false} />
            <ThemedText type="label" themeColor="textSecondary">
              {uppercase(t('rare.locked'))}
            </ThemedText>
          </Animated.View>
        ) : null}
      </View>

      <View style={styles.status}>
        <ThemedText key={`${view.round}-${current.text}`} type="subtitle" themeColor={current.color} style={styles.centered} accessibilityLiveRegion="polite">
          {uppercase(current.text)}
        </ThemedText>
        {notice && !result ? (
          <ThemedText type="small" themeColor="gold" style={styles.centered}>
            {notice}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.action}>
        {canName ? <ActionButton label={t('rare.name')} onPress={() => setSearching(view.round)} /> : null}
      </View>

      {canName && searching === view.round ? (
        <FootballerSearch
          title={title}
          market={rare.market.code}
          secondsLeft={secondsLeft}
          excludedIds={[]}
          onSelect={(footballer) => {
            setSearching(null);
            onAct({ kind: 'name', footballerId: footballer.id });
          }}
          onClose={() => setSearching(null)}
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
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
  criteria: {
    fontFamily: Fonts.display,
    fontSize: 26,
    lineHeight: 30,
    color: Colors.text,
  },
  pips: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  pip: {
    width: PIP_SIZE,
    height: PIP_SIZE,
    borderRadius: PIP_SIZE / 2,
    borderWidth: 1.5,
    borderColor: Colors.strokeBright,
    backgroundColor: Colors.panel,
  },
  pipDrawn: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  middle: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  reveal: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  column: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  fame: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  fameTrack: {
    width: FAME_BAR_WIDTH,
    height: 6,
    borderRadius: Radius.small,
    backgroundColor: Colors.panelRaised,
    overflow: 'hidden',
  },
  fameFill: {
    height: 6,
  },
  own: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  status: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  centered: {
    textAlign: 'center',
  },
  action: {
    alignSelf: 'stretch',
    minHeight: MinimumTouchSize + Spacing.two,
    justifyContent: 'center',
  },
});
