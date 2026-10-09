import { opponentOf, type Side } from '@sportapps/game-core';
import { HIGHER_ANSWER_SECONDS, type HigherAction, type HigherMetric } from '@sportapps/protocol';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, Keyframe } from 'react-native-reanimated';

import { MetalPlate } from '@/components/metal-plate';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Finishes, Fonts, MaxContentWidth, MinimumTouchSize, Motion, Spacing, type ThemeColor } from '@/constants/theme';
import { METRIC_KEYS, metricValueText } from '@/features/duel/labels';
import { JokerBar } from '@/features/jokers/joker-bar';
import { FootballerCard, type CardEmphasis } from '@/features/match/footballer-card';
import { ResultOverlay } from '@/features/match/result-overlay';
import { Scoreboard } from '@/features/match/scoreboard';
import { ownScoreFirst } from '@/features/match/sides';
import { TurnTimer } from '@/features/match/turn-timer';
import { URGENT_SECONDS } from '@/features/match/use-match-effects';
import type { OnlineHigher } from '@/features/match/use-online-match';
import { haptics } from '@/feedback/haptics';
import { playSound } from '@/feedback/sounds';
import { useUppercase } from '@/i18n/uppercase';

const CARD_HEIGHT_SHARE = 0.22;
const CARD_GAP = Spacing.three;
const PIP_SIZE = 12;
const VALUE_POP = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 1.7 }] },
  60: { opacity: 1, transform: [{ scale: 0.92 }] },
  100: { opacity: 1, transform: [{ scale: 1 }] },
})
  .duration(Motion.slow)
  .delay(Motion.base);

export const HIGHER_QUESTION_KEYS = {
  goals: 'higher.questionGoals',
  assists: 'higher.questionAssists',
  appearances: 'higher.questionAppearances',
  marketValue: 'higher.questionMarketValue',
  caps: 'higher.questionCaps',
  older: 'higher.questionOlder',
  younger: 'higher.questionYounger',
} as const satisfies Record<HigherMetric, string>;

interface HigherMatchViewProps {
  higher: OnlineHigher;
  secondsLeft: number;
  canAct: boolean;
  notice: string | null;
  playAgainLabel: string;
  onAct: (action: HigherAction) => void;
  onPlayAgain: () => void;
  onQuit: () => void;
}

function useHigherEffects(higher: OnlineHigher, secondsLeft: number) {
  const { view, side } = higher;
  const answers = view.last ? `${view.inning}-${view.streak}-${view.scores.x}-${view.scores.o}` : null;
  const lastCorrect = view.last?.correct ?? null;
  const lastMine = view.last?.side === side;
  const myTurn = view.phase === 'answering' && view.turn === side;

  useEffect(() => {
    playSound('whistle');
  }, []);

  useEffect(() => {
    if (answers === null || lastCorrect === null) {
      return;
    }
    playSound('impact');
    if (!lastMine) {
      haptics.tick();
    } else if (lastCorrect) {
      haptics.success();
      playSound('correct');
    } else {
      haptics.error();
      playSound('wrong');
    }
  }, [answers, lastCorrect, lastMine]);

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
    if (myTurn && secondsLeft > 0 && secondsLeft <= URGENT_SECONDS) {
      haptics.tick();
      playSound('tick');
    }
  }, [myTurn, secondsLeft]);
}

export function HigherMatchView({
  higher,
  secondsLeft,
  canAct,
  notice,
  playAgainLabel,
  onAct,
  onPlayAgain,
  onQuit,
}: HigherMatchViewProps) {
  const { t, i18n } = useTranslation();
  const uppercase = useUppercase();
  const { width, height } = useWindowDimensions();
  const { view, side } = higher;
  const rival = opponentOf(side);

  useHigherEffects(higher, secondsLeft);

  const { result } = view;
  const answering = view.phase === 'answering';
  const myTurn = answering && view.turn === side;
  const urgent = myTurn && secondsLeft <= URGENT_SECONDS;
  const contentWidth = Math.min(width, MaxContentWidth) - Spacing.three * 2;
  const cardSize = Math.floor(Math.min((contentWidth - CARD_GAP) / 2, height * CARD_HEIGHT_SHARE));
  const names = { [side]: t('match.you'), [rival]: higher.usernames[rival] } as Record<Side, string>;
  const shown = answering ? view.question : (view.last?.question ?? null);
  const revealed = !answering ? view.last : null;
  const won = result?.winner === side;
  const pipSide = answering ? view.turn : (view.last?.side ?? view.turn);

  const status = (): { text: string; color: ThemeColor } => {
    if (revealed) {
      const mine = revealed.side === side;
      if (revealed.correct) {
        return { text: t(mine ? 'higher.correctYou' : 'higher.correctOpponent'), color: mine ? 'positive' : 'gold' };
      }
      if (revealed.choice === null) {
        return { text: t('higher.timeout'), color: 'negative' };
      }
      return { text: t(mine ? 'higher.wrongYou' : 'higher.wrongOpponent'), color: mine ? 'negative' : 'positive' };
    }
    return myTurn ? { text: t('higher.yourTurn'), color: 'volt' } : { text: t('higher.opponentTurn'), color: 'textSecondary' };
  };
  const current = status();

  const emphasisOf = (card: number): CardEmphasis => {
    if (!revealed) {
      return 'none';
    }
    const [first, second] = revealed.question.cards;
    const [firstValue, secondValue] = revealed.values;
    const firstBetter = revealed.question.prefer === 'high' ? firstValue > secondValue : firstValue < secondValue;
    const better = firstValue === secondValue ? null : firstBetter ? first : second;
    if (better === null) {
      return 'none';
    }
    return card === better ? 'winner' : 'dimmed';
  };

  return (
    <Screen
      scroll
      contentStyle={styles.content}
      overlay={
        result ? (
          <ResultOverlay
            title={!result.winner ? t('match.draw') : t(won ? 'match.youWin' : 'match.youLose')}
            detail={
              result.reason === 'forfeit'
                ? t(won ? 'match.byForfeitWin' : 'match.byForfeitLoss')
                : t(result.reason === 'speed' ? 'match.bySpeed' : 'higher.byScore')
            }
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
            {uppercase(t('higher.inning', { inning: view.inning, total: view.totalInnings }))}
          </ThemedText>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(Motion.slow)} style={styles.stretch}>
        <Scoreboard
          side={side}
          names={names}
          scores={view.scores}
          activeSide={result ? null : answering ? view.turn : (view.last?.side ?? null)}
          center={
            <TurnTimer
              turnEndsAt={higher.deadlineAt}
              totalSeconds={HIGHER_ANSWER_SECONDS}
              secondsLeft={answering ? secondsLeft : 0}
              color={urgent ? Colors.negative : answering ? Finishes[view.turn].base : Colors.strokeBright}
              running={answering}
              urgent={urgent}
              accessibilityLabel={t('match.secondsLeft', { seconds: secondsLeft })}
            />
          }
        />
      </Animated.View>

      <JokerBar scope={view.question?.cards.join('-') ?? 'reveal'} available={() => myTurn} metric={view.question?.metric ?? null} />

      <Animated.View key={shown ? shown.cards.join('-') : 'none'} entering={FadeInDown.duration(Motion.slow)} style={styles.stretch}>
        <MetalPlate finish={null} cut="right" cutSize={20} radius={14} style={styles.plate}>
          <ThemedText
            style={styles.question}
            accessibilityRole="header"
            accessibilityLiveRegion="polite"
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}>
            {shown ? uppercase(t(HIGHER_QUESTION_KEYS[shown.metric])) : ''}
          </ThemedText>
        </MetalPlate>
      </Animated.View>

      <View style={styles.pips} accessible accessibilityLabel={`${t('higher.streak')}: ${view.streak}/${view.streakLimit}`}>
        <ThemedText type="label" themeColor="textSecondary">
          {uppercase(t('higher.streak'))}
        </ThemedText>
        {Array.from({ length: view.streakLimit }, (_, index) => (
          <View
            key={index}
            style={[styles.pip, index < view.streak && { backgroundColor: Finishes[pipSide].base, borderColor: Finishes[pipSide].light }]}
          />
        ))}
      </View>

      {shown ? (
        <View style={styles.cards}>
          {shown.cards.map((card, index) => (
            <View key={`${shown.cards.join('-')}-${card}`} style={[styles.column, { width: cardSize }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={higher.cards[card]?.name}
                accessibilityState={{ disabled: !myTurn || !canAct }}
                disabled={!myTurn || !canAct}
                onPress={() => {
                  haptics.select();
                  onAct({ kind: 'choose', footballerId: card });
                }}
                style={({ pressed }) => [pressed && styles.pressed]}>
                <FootballerCard
                  footballer={higher.cards[card] ?? null}
                  side={answering ? view.turn : (view.last?.side ?? view.turn)}
                  size={cardSize}
                  emphasis={emphasisOf(card)}
                  watermark={false}
                />
                {revealed?.choice === card ? <View style={[styles.chosen, { borderColor: Colors.volt }]} pointerEvents="none" /> : null}
              </Pressable>
              <View style={styles.value}>
                {revealed ? (
                  <Animated.View entering={VALUE_POP} style={styles.valueContent}>
                    <ThemedText style={styles.valueText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                      {metricValueText(t, revealed.question.metric, revealed.values[index] ?? null, i18n.language)}
                    </ThemedText>
                    <ThemedText type="label" themeColor="textSecondary" style={styles.centered} numberOfLines={1}>
                      {uppercase(t(METRIC_KEYS[revealed.question.metric]))}
                    </ThemedText>
                  </Animated.View>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.status}>
        <ThemedText
          key={`${view.inning}-${view.streak}-${view.phase}-${current.text}`}
          type="subtitle"
          themeColor={current.color}
          style={styles.centered}
          accessibilityLiveRegion="polite">
          {uppercase(current.text)}
        </ThemedText>
        {notice && !result ? (
          <ThemedText type="small" themeColor="gold" style={styles.centered}>
            {notice}
          </ThemedText>
        ) : null}
      </View>
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
    minHeight: 72,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  question: {
    fontFamily: Fonts.display,
    fontSize: 26,
    lineHeight: 28,
    textAlign: 'center',
    color: Colors.text,
  },
  pips: {
    flexDirection: 'row',
    alignItems: 'center',
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
  cards: {
    flexDirection: 'row',
    gap: CARD_GAP,
  },
  column: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
  chosen: {
    position: 'absolute',
    top: -4,
    right: -4,
    bottom: -4,
    left: -4,
    borderWidth: 3,
    borderRadius: 14,
  },
  value: {
    alignSelf: 'stretch',
    height: 60,
    justifyContent: 'center',
  },
  valueContent: {
    alignItems: 'stretch',
  },
  valueText: {
    fontFamily: Fonts.display,
    fontSize: 34,
    lineHeight: 38,
    textAlign: 'center',
    color: Colors.text,
    fontVariant: ['tabular-nums'],
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
});
