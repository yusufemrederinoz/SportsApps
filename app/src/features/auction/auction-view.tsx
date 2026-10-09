import { opponentOf, type Side } from '@sportapps/game-core';
import type { AuctionView, GameAction } from '@sportapps/protocol';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, Keyframe } from 'react-native-reanimated';

import { ActionButton } from '@/components/action-button';
import { MetalPlate } from '@/components/metal-plate';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Finishes, Fonts, MinimumTouchSize, Motion, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { shortName } from '@/features/draft/lineup-board';
import { JokerBar } from '@/features/jokers/joker-bar';
import { flagEmoji } from '@/features/match/flags';
import { FootballerSearch } from '@/features/match/footballer-search';
import { ResultOverlay } from '@/features/match/result-overlay';
import { Scoreboard } from '@/features/match/scoreboard';
import { ownScoreFirst } from '@/features/match/sides';
import { TurnTimer } from '@/features/match/turn-timer';
import { URGENT_SECONDS } from '@/features/match/use-match-effects';
import type { OnlineAuction } from '@/features/match/use-online-match';
import { useCriteriaLabels } from '@/features/rare/rare-view';
import { haptics } from '@/feedback/haptics';
import { playSound } from '@/feedback/sounds';
import { useNameUppercase, useUppercase } from '@/i18n/uppercase';

const STEP_SIZE = 56;
const BID_POP = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 1.8 }] },
  60: { opacity: 1, transform: [{ scale: 0.92 }] },
  100: { opacity: 1, transform: [{ scale: 1 }] },
}).duration(Motion.slow);

interface AuctionMatchViewProps {
  auction: OnlineAuction;
  secondsLeft: number;
  canAct: boolean;
  notice: string | null;
  playAgainLabel: string;
  onAct: (action: GameAction) => void;
  onPlayAgain: () => void;
  onQuit: () => void;
}

function useAuctionEffects(auction: OnlineAuction, secondsLeft: number) {
  const { view, side } = auction;
  const bidKey = `${view.round}-${view.bid}`;
  const named = view.named.length;
  const missed = view.missed.length;
  const outcomeWinner = view.outcome?.winner ?? null;
  const acting = (view.phase === 'bidding' && view.turn === side) || (view.phase === 'proving' && view.bidder === side);

  useEffect(() => {
    playSound('whistle');
  }, []);

  useEffect(() => {
    playSound('tick');
    haptics.tick();
  }, [bidKey]);

  useEffect(() => {
    if (named > 0) {
      playSound('correct');
      haptics.success();
    }
  }, [named]);

  useEffect(() => {
    if (missed > 0) {
      playSound('wrong');
      haptics.error();
    }
  }, [missed]);

  useEffect(() => {
    if (outcomeWinner === null) {
      return;
    }
    playSound('impact');
    if (outcomeWinner === side) {
      haptics.success();
    } else {
      haptics.warning();
    }
  }, [outcomeWinner, side]);

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
    if (acting && secondsLeft > 0 && secondsLeft <= URGENT_SECONDS) {
      haptics.tick();
      playSound('tick');
    }
  }, [acting, secondsLeft]);
}

function nextBid(view: AuctionView, wanted: number | null): number {
  const lowest = view.bid + 1;
  return Math.min(view.maxBid, Math.max(lowest, wanted ?? lowest));
}

export function AuctionMatchView({
  auction,
  secondsLeft,
  canAct,
  notice,
  playAgainLabel,
  onAct,
  onPlayAgain,
  onQuit,
}: AuctionMatchViewProps) {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const nameUppercase = useNameUppercase();
  const [wanted, setWanted] = useState<{ key: string; amount: number } | null>(null);
  const [searching, setSearching] = useState<string | null>(null);
  const { view, side } = auction;
  const rival = opponentOf(side);
  const labels = useCriteriaLabels(view.criteria, auction.market.code);

  useAuctionEffects(auction, secondsLeft);

  const { result } = view;
  const bidKey = `${view.round}-${view.bid}`;
  const bidding = view.phase === 'bidding';
  const proving = view.phase === 'proving';
  const myBid = bidding && view.turn === side && canAct;
  const myProof = proving && view.bidder === side && canAct;
  const amount = nextBid(view, wanted?.key === bidKey ? wanted.amount : null);
  const acting = (bidding && view.turn === side) || (proving && view.bidder === side);
  const urgent = acting && secondsLeft <= URGENT_SECONDS;
  const running = bidding || proving;
  const names = { [side]: t('match.you'), [rival]: auction.usernames[rival] } as Record<Side, string>;
  const won = result?.winner === side;
  const title = labels
    ? labels.map((label) => `${flagEmoji(label.countryCode) ?? ''} ${nameUppercase(label.name, label.local)}`.trim()).join('  ×  ')
    : '';
  const searchKey = `${view.round}-${view.named.length}-${view.missed.length}`;
  const proofKey = `${view.round}-${view.phase}`;
  const chips =
    view.named.length > 0 || view.missed.length > 0 ? (
      <View style={styles.chips}>
        {view.named.map((footballerId) => (
          <Animated.View key={`named-${footballerId}`} entering={FadeIn.duration(Motion.base)} style={[styles.chip, styles.chipRight]}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {shortName(auction.cards[footballerId]?.name ?? '?')}
            </ThemedText>
          </Animated.View>
        ))}
        {view.missed.map((footballerId) => (
          <Animated.View key={`missed-${footballerId}`} entering={FadeIn.duration(Motion.base)} style={[styles.chip, styles.chipWrong]}>
            <ThemedText type="smallBold" themeColor="negative" numberOfLines={1} style={styles.struck}>
              {shortName(auction.cards[footballerId]?.name ?? '?')}
            </ThemedText>
          </Animated.View>
        ))}
      </View>
    ) : null;
  const activeSide: Side | null = bidding ? view.turn : proving ? view.bidder : null;

  const status = (): { text: string; color: ThemeColor } => {
    if (view.outcome && !running) {
      const { prover, winner } = view.outcome;
      const proved = prover === winner;
      const key = prover === side ? (proved ? 'auction.provedYours' : 'auction.failedYours') : proved ? 'auction.proved' : 'auction.failed';
      return {
        text: t(key),
        color: winner === side ? 'positive' : 'negative',
      };
    }
    if (proving) {
      return view.bidder === side
        ? { text: t('auction.proveYours', { bid: view.bid }), color: 'volt' }
        : { text: t('auction.proveTheirs', { bid: view.bid }), color: 'gold' };
    }
    return view.turn === side
      ? { text: t(view.bidder === null ? 'auction.openBid' : 'auction.raiseOrChallenge'), color: 'volt' }
      : { text: t('auction.opponentThinking'), color: 'textSecondary' };
  };
  const current = status();

  return (
    <Screen
      scroll
      contentStyle={styles.content}
      overlay={
        result ? (
          <ResultOverlay
            title={!result.winner ? t('match.draw') : t(won ? 'match.youWin' : 'match.youLose')}
            detail={result.reason === 'forfeit' ? t(won ? 'match.byForfeitWin' : 'match.byForfeitLoss') : t('auction.byScore')}
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
            {uppercase(t('auction.round', { round: view.round, target: view.roundsToWin }))}
          </ThemedText>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(Motion.slow)} style={styles.stretch}>
        <Scoreboard
          side={side}
          names={names}
          scores={view.scores}
          activeSide={activeSide}
          center={
            <TurnTimer
              key={`${view.round}-${view.phase}-${view.bid}`}
              turnEndsAt={auction.deadlineAt}
              totalSeconds={Math.max(1, view.phaseSeconds)}
              secondsLeft={running ? secondsLeft : 0}
              color={urgent ? Colors.negative : running && activeSide ? Finishes[activeSide].base : Colors.strokeBright}
              running={running}
              urgent={urgent}
              accessibilityLabel={t('match.secondsLeft', { seconds: secondsLeft })}
            />
          }
        />
      </Animated.View>

      <JokerBar scope={view.round} available={(joker) => (joker === 'extra-time' ? proving && view.bidder === side : running)} />

      <Animated.View key={view.round} entering={FadeInDown.duration(Motion.slow)} style={styles.stretch}>
        <MetalPlate finish={null} cut="right" cutSize={20} radius={14} style={styles.plate}>
          <ThemedText type="label" themeColor="volt">
            {uppercase(t('auction.criteria'))}
          </ThemedText>
          <ThemedText style={styles.criteria} accessibilityRole="header" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
            {title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('auction.rule')}
          </ThemedText>
        </MetalPlate>
      </Animated.View>

      <View style={styles.bidBox} accessible accessibilityLabel={t('auction.bidLabel', { bid: view.bid })}>
        <ThemedText type="label" themeColor="textSecondary">
          {uppercase(
            view.bidder === null
              ? t('auction.noBid')
              : view.bidder === side
                ? t('auction.lastBidYours')
                : t('auction.lastBid'),
          )}
        </ThemedText>
        <Animated.View key={bidKey} entering={BID_POP}>
          <ThemedText style={[styles.bid, { color: view.bidder ? Finishes[view.bidder].base : Colors.strokeBright }]}>
            {String(view.bid)}
          </ThemedText>
        </Animated.View>
        {proving || (view.outcome && !running) ? (
          <ThemedText type="label" themeColor="gold">
            {t('auction.progress', { named: view.named.length, bid: view.bid })}
          </ThemedText>
        ) : null}
      </View>

      {chips}

      <View style={styles.status}>
        <ThemedText key={`${searchKey}-${view.phase}-${current.text}`} type="subtitle" themeColor={current.color} style={styles.centered} accessibilityLiveRegion="polite">
          {uppercase(current.text)}
        </ThemedText>
        {notice && !result ? (
          <ThemedText type="small" themeColor="gold" style={styles.centered}>
            {notice}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.actions}>
        {myBid ? (
          <>
            <View style={styles.stepper}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('auction.less')}
                disabled={amount <= view.bid + 1}
                onPress={() => {
                  haptics.select();
                  setWanted({ key: bidKey, amount: amount - 1 });
                }}
                style={({ pressed }) => [styles.step, pressed && styles.stepPressed, amount <= view.bid + 1 && styles.stepDisabled]}>
                <ThemedText style={styles.stepText}>−</ThemedText>
              </Pressable>
              <ThemedText style={styles.amount}>{String(amount)}</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('auction.more')}
                disabled={amount >= view.maxBid}
                onPress={() => {
                  haptics.select();
                  setWanted({ key: bidKey, amount: amount + 1 });
                }}
                style={({ pressed }) => [styles.step, pressed && styles.stepPressed, amount >= view.maxBid && styles.stepDisabled]}>
                <ThemedText style={styles.stepText}>+</ThemedText>
              </Pressable>
            </View>
            <ActionButton label={t('auction.raise', { amount })} onPress={() => onAct({ kind: 'bid', amount })} />
            {view.bidder !== null ? (
              <ActionButton label={t('auction.challenge')} onPress={() => onAct({ kind: 'challenge' })} variant="secondary" />
            ) : null}
          </>
        ) : myProof ? (
          <ActionButton label={t('auction.name')} onPress={() => setSearching(proofKey)} />
        ) : null}
      </View>

      {myProof && searching === proofKey ? (
        <FootballerSearch
          title={title}
          market={auction.market.code}
          secondsLeft={secondsLeft}
          excludedIds={[...view.named, ...view.missed]}
          closeLabel={t('auction.searchDone', { named: view.named.length, bid: view.bid })}
          footer={chips}
          onSelect={(footballer) => onAct({ kind: 'name', footballerId: footballer.id })}
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
  bidBox: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  bid: {
    fontFamily: Fonts.display,
    fontSize: 88,
    lineHeight: 92,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  chips: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.small,
    borderWidth: 1.5,
    maxWidth: 160,
  },
  chipRight: {
    borderColor: Colors.positive,
    backgroundColor: 'rgba(59, 234, 139, 0.12)',
  },
  chipWrong: {
    borderColor: Colors.negative,
    backgroundColor: 'rgba(255, 77, 106, 0.1)',
  },
  struck: {
    textDecorationLine: 'line-through',
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
  actions: {
    alignSelf: 'stretch',
    gap: Spacing.two,
    minHeight: MinimumTouchSize + Spacing.two,
    justifyContent: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  step: {
    width: STEP_SIZE,
    height: STEP_SIZE,
    borderRadius: STEP_SIZE / 2,
    alignItems: 'stretch',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.volt,
    backgroundColor: Colors.panel,
  },
  stepPressed: {
    backgroundColor: Colors.panelRaised,
  },
  stepDisabled: {
    opacity: 0.35,
  },
  stepText: {
    fontFamily: Fonts.heading,
    fontSize: 32,
    lineHeight: 36,
    textAlign: 'center',
    color: Colors.volt,
  },
  amount: {
    minWidth: 64,
    fontFamily: Fonts.display,
    fontSize: 44,
    lineHeight: 48,
    textAlign: 'center',
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
});
