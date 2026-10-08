import { opponentOf, type Side } from '@sportapps/game-core';
import { CAREER_TURN_SECONDS, type RareAction } from '@sportapps/protocol';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInLeft } from 'react-native-reanimated';

import { ActionButton } from '@/components/action-button';
import { ClubCrest } from '@/components/club-crest';
import { MetalPlate } from '@/components/metal-plate';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Finishes, Fonts, MinimumTouchSize, Motion, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useClubLabels } from '@/features/chain/chain-view';
import { JokerBar } from '@/features/jokers/joker-bar';
import { FootballerCard } from '@/features/match/footballer-card';
import { FootballerSearch } from '@/features/match/footballer-search';
import { ResultOverlay } from '@/features/match/result-overlay';
import { Scoreboard } from '@/features/match/scoreboard';
import { ownScoreFirst } from '@/features/match/sides';
import { TurnTimer } from '@/features/match/turn-timer';
import { URGENT_SECONDS } from '@/features/match/use-match-effects';
import type { OnlineCareer } from '@/features/match/use-online-match';
import { haptics } from '@/feedback/haptics';
import { playSound } from '@/feedback/sounds';
import { NAME_SLOT, useNameUppercase, useUppercase, useUppercaseAround } from '@/i18n/uppercase';

const CARD_HEIGHT_SHARE = 0.17;
const MAXIMUM_CARD_SIZE = 150;
const DOT_SIZE = 12;
const CREST_SIZE = 26;

interface CareerMatchViewProps {
  career: OnlineCareer;
  secondsLeft: number;
  canAct: boolean;
  notice: string | null;
  playAgainLabel: string;
  onAct: (action: RareAction) => void;
  onPlayAgain: () => void;
  onQuit: () => void;
}

function useCareerEffects(career: OnlineCareer, secondsLeft: number) {
  const { view, side } = career;
  const clues = view.clues.length;
  const solvedBy = view.lastGuess?.correct ? view.lastGuess.side : null;
  const myTurn = view.phase === 'playing' && view.turn === side;

  useEffect(() => {
    playSound('whistle');
  }, []);

  useEffect(() => {
    if (clues > 1) {
      playSound('whoosh');
      haptics.tick();
    }
  }, [clues]);

  useEffect(() => {
    if (solvedBy === null) {
      return;
    }
    if (solvedBy === side) {
      haptics.success();
      playSound('correct');
    } else {
      haptics.warning();
      playSound('impact');
    }
  }, [solvedBy, side]);

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

export function CareerMatchView({
  career,
  secondsLeft,
  canAct,
  notice,
  playAgainLabel,
  onAct,
  onPlayAgain,
  onQuit,
}: CareerMatchViewProps) {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const nameUppercase = useNameUppercase();
  const uppercaseAround = useUppercaseAround();
  const { height } = useWindowDimensions();
  const [searching, setSearching] = useState<string | null>(null);
  const { view, side } = career;
  const rival = opponentOf(side);
  const clubs = useClubLabels(
    view.clues.map((clue) => clue.clubId),
    career.market.code,
  );

  useCareerEffects(career, secondsLeft);

  const { result } = view;
  const playing = view.phase === 'playing';
  const myTurn = playing && view.turn === side;
  const canGuess = myTurn && canAct;
  const urgent = myTurn && secondsLeft <= URGENT_SECONDS;
  const cardSize = Math.floor(Math.min(MAXIMUM_CARD_SIZE, height * CARD_HEIGHT_SHARE));
  const names = { [side]: t('match.you'), [rival]: career.usernames[rival] } as Record<Side, string>;
  const won = result?.winner === side;
  const answer = view.answer === null ? null : (career.cards[view.answer] ?? null);
  const turnKey = `${view.round}-${view.clues.length}-${view.phase}`;
  const homeCountry = career.market.code.toUpperCase();

  const status = (): { text: string; color: ThemeColor } => {
    const guess = view.lastGuess;
    if (!playing) {
      if (guess?.correct) {
        return {
          text: uppercase(t(guess.side === side ? 'career.solvedByYou' : 'career.solvedByRival')),
          color: guess.side === side ? 'positive' : 'negative',
        };
      }
      return { text: uppercase(t('career.unsolved')), color: 'gold' };
    }
    if (guess && !guess.correct) {
      const said = guess.footballerId === null ? null : (career.cards[guess.footballerId] ?? null);
      return {
        text: said
          ? uppercaseAround(t('career.wrong', { name: NAME_SLOT }), said.name, said.countryCode === homeCountry)
          : uppercase(t('career.timeout')),
        color: guess.side === side ? 'negative' : 'textSecondary',
      };
    }
    return myTurn
      ? { text: uppercase(t('career.yourTurn')), color: 'volt' }
      : { text: uppercase(t('career.opponentTurn')), color: 'textSecondary' };
  };
  const current = status();

  return (
    <Screen
      contentStyle={styles.content}
      overlay={
        result ? (
          <ResultOverlay
            title={!result.winner ? t('match.draw') : t(won ? 'match.youWin' : 'match.youLose')}
            detail={
              result.reason === 'forfeit'
                ? t(won ? 'match.byForfeitWin' : 'match.byForfeitLoss')
                : t(result.reason === 'speed' ? 'match.bySpeed' : 'career.byScore')
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
            {uppercase(t('career.round', { round: view.round, total: view.totalRounds }))}
          </ThemedText>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(Motion.slow)} style={styles.stretch}>
        <Scoreboard
          side={side}
          names={names}
          scores={view.scores}
          activeSide={playing ? view.turn : null}
          center={
            <TurnTimer
              key={turnKey}
              turnEndsAt={career.deadlineAt}
              totalSeconds={CAREER_TURN_SECONDS}
              secondsLeft={playing ? secondsLeft : 0}
              color={urgent ? Colors.negative : playing ? Finishes[view.turn].base : Colors.strokeBright}
              running={playing}
              urgent={urgent}
              accessibilityLabel={t('match.secondsLeft', { seconds: secondsLeft })}
            />
          }
        />
      </Animated.View>

      <JokerBar scope={view.round} available={() => view.phase === 'playing'} />

      <Animated.View key={view.round} entering={FadeInDown.duration(Motion.slow)} style={styles.stretch}>
        <MetalPlate finish={null} cut="right" cutSize={20} radius={14} style={styles.plate}>
          <ThemedText style={styles.title} accessibilityRole="header">
            {uppercase(t('career.question'))}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {playing ? t('career.rule', { points: view.points }) : t('career.scope')}
          </ThemedText>
        </MetalPlate>
      </Animated.View>

      <View style={styles.path}>
        {Array.from({ length: view.totalClues }, (_, index) => {
          const clue = view.clues[index];
          const club = clue ? clubs[clue.clubId] : undefined;
          return (
            <View key={`${view.round}-${index}`} style={styles.step}>
              <View style={[styles.dot, clue && styles.dotOpen]} />
              {clue ? (
                <Animated.View entering={FadeInLeft.duration(Motion.base)} style={styles.stepBody}>
                  <ThemedText type="label" themeColor="gold" style={styles.years}>
                    {clue.lastYear && clue.lastYear !== clue.firstYear ? `${clue.firstYear}–${clue.lastYear}` : String(clue.firstYear)}
                  </ThemedText>
                  <ClubCrest clubId={clue.clubId} size={CREST_SIZE} />
                  <ThemedText type="smallBold" numberOfLines={1} style={styles.club}>
                    {club ? nameUppercase(club.name, club.local) : ''}
                  </ThemedText>
                </Animated.View>
              ) : (
                <ThemedText type="smallBold" themeColor="strokeBright">
                  ?
                </ThemedText>
              )}
            </View>
          );
        })}
      </View>

      {!playing && view.answer !== null ? (
        <Animated.View entering={FadeIn.duration(Motion.base)} style={styles.answer}>
          <FootballerCard footballer={answer} side={view.lastGuess?.correct ? view.lastGuess.side : side} size={cardSize} emphasis="none" watermark={false} />
        </Animated.View>
      ) : null}

      <View style={styles.status}>
        <ThemedText key={`${turnKey}-${current.text}`} type="subtitle" themeColor={current.color} style={styles.centered} accessibilityLiveRegion="polite" numberOfLines={2}>
          {current.text}
        </ThemedText>
        {notice && !result ? (
          <ThemedText type="small" themeColor="gold" style={styles.centered}>
            {notice}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.action}>
        {canGuess ? <ActionButton label={t('career.guess', { points: view.points })} onPress={() => setSearching(turnKey)} /> : null}
      </View>

      {canGuess && searching === turnKey ? (
        <FootballerSearch
          title={t('career.question')}
          market={career.market.code}
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
  title: {
    fontFamily: Fonts.display,
    fontSize: 26,
    lineHeight: 28,
    color: Colors.text,
  },
  path: {
    alignSelf: 'stretch',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 34,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.small,
    backgroundColor: Colors.panel,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 1.5,
    borderColor: Colors.strokeBright,
  },
  dotOpen: {
    borderColor: Colors.gold,
    backgroundColor: Colors.gold,
  },
  stepBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  years: {
    minWidth: 84,
  },
  club: {
    flex: 1,
  },
  answer: {
    alignItems: 'center',
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
