import { opponentOf, type Side } from '@sportapps/game-core';
import type { ChainAction } from '@sportapps/protocol';
import { Image } from 'expo-image';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';

import { portraitUrl } from '@/api';
import { ActionButton } from '@/components/action-button';
import { ClubCrest } from '@/components/club-crest';
import { MetalPlate } from '@/components/metal-plate';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Finishes, Fonts, MinimumTouchSize, Motion, Spacing, type ThemeColor } from '@/constants/theme';
import { loadClubLabel } from '@/data/queries';
import type { ClubLabel } from '@/data/types';
import { shortName } from '@/features/draft/lineup-board';
import { JokerBar } from '@/features/jokers/joker-bar';
import { FootballerCard } from '@/features/match/footballer-card';
import { FootballerSearch } from '@/features/match/footballer-search';
import { ResultOverlay } from '@/features/match/result-overlay';
import { Scoreboard } from '@/features/match/scoreboard';
import { ownScoreFirst } from '@/features/match/sides';
import { TurnTimer } from '@/features/match/turn-timer';
import { URGENT_SECONDS } from '@/features/match/use-match-effects';
import type { OnlineChain } from '@/features/match/use-online-match';
import type { PlayedFootballer } from '@/features/match/session';
import { haptics } from '@/feedback/haptics';
import { playSound } from '@/feedback/sounds';
import { NAME_SLOT, useNameUppercase, useUppercase, useUppercaseAround } from '@/i18n/uppercase';

import { chainCardIds, chainClubIds } from './online';

const CARD_HEIGHT_SHARE = 0.2;
const MAXIMUM_CARD_SIZE = 180;
const NODE_SIZE = 40;
const CREST_SIZE = 28;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}

interface ChainMatchViewProps {
  chain: OnlineChain;
  secondsLeft: number;
  canAct: boolean;
  notice: string | null;
  playAgainLabel: string;
  onAct: (action: ChainAction) => void;
  onPlayAgain: () => void;
  onQuit: () => void;
}

export function useClubLabels(clubIds: readonly number[], market: string): Readonly<Record<number, ClubLabel>> {
  const database = useSQLiteContext();
  const { i18n } = useTranslation();
  const language = i18n.language;
  const key = clubIds.join(',');
  const [labels, setLabels] = useState<Readonly<Record<number, ClubLabel>>>({});

  useEffect(() => {
    let cancelled = false;
    const wanted = key ? key.split(',').map(Number) : [];
    void Promise.all(wanted.map((clubId) => loadClubLabel(database, clubId, market, language))).then((loaded) => {
      if (!cancelled) {
        setLabels(Object.fromEntries(loaded.map((label) => [label.id, label])));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [database, key, market, language]);

  return labels;
}

function useChainEffects(chain: OnlineChain, secondsLeft: number) {
  const { view, side } = chain;
  const links = view.chain.length;
  const missKey = view.miss ? `${view.round}-${view.miss.side}-${view.miss.reason}` : null;
  const missedByMe = view.miss?.side === side;
  const myTurn = view.phase === 'playing' && view.turn === side;

  useEffect(() => {
    playSound('whistle');
  }, []);

  useEffect(() => {
    if (links > 1) {
      playSound('impact');
      haptics.tick();
    }
  }, [links]);

  useEffect(() => {
    if (missKey === null) {
      return;
    }
    if (missedByMe) {
      haptics.error();
      playSound('wrong');
    } else {
      haptics.success();
      playSound('correct');
    }
  }, [missKey, missedByMe]);

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

function Node({ footballer, side }: { footballer: PlayedFootballer | null; side: Side | null }) {
  const finish = side ? Finishes[side] : null;
  const portrait = footballer?.hasPortrait ? portraitUrl(footballer.id) : null;
  return (
    <View style={styles.node}>
      <View style={[styles.nodeBadge, { borderColor: finish?.base ?? Colors.strokeBright }]}>
        {portrait ? (
          <Image source={{ uri: portrait }} style={styles.nodeImage} contentFit="contain" cachePolicy="disk" accessible={false} />
        ) : (
          <ThemedText style={[styles.nodeInitials, { color: finish?.base ?? Colors.textSecondary }]}>
            {footballer ? initials(footballer.name) : '?'}
          </ThemedText>
        )}
      </View>
      <ThemedText style={styles.nodeName} numberOfLines={1}>
        {footballer ? shortName(footballer.name) : '?'}
      </ThemedText>
    </View>
  );
}

export function ChainMatchView({
  chain,
  secondsLeft,
  canAct,
  notice,
  playAgainLabel,
  onAct,
  onPlayAgain,
  onQuit,
}: ChainMatchViewProps) {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const nameUppercase = useNameUppercase();
  const uppercaseAround = useUppercaseAround();
  const { height } = useWindowDimensions();
  const [searching, setSearching] = useState<number | null>(null);
  const strip = useRef<ScrollView>(null);
  const { view, side } = chain;
  const rival = opponentOf(side);
  const clubs = useClubLabels(chainClubIds(view), chain.market.code);

  useChainEffects(chain, secondsLeft);

  const { result } = view;
  const playing = view.phase === 'playing';
  const myTurn = playing && view.turn === side;
  const canSay = myTurn && canAct;
  const urgent = myTurn && secondsLeft <= URGENT_SECONDS;
  const cardSize = Math.floor(Math.min(MAXIMUM_CARD_SIZE, height * CARD_HEIGHT_SHARE));
  const names = { [side]: t('match.you'), [rival]: chain.usernames[rival] } as Record<Side, string>;
  const current = view.chain.at(-1) ?? null;
  const previous = view.chain.slice(0, -1);
  const currentFootballer = current ? (chain.cards[current.footballerId] ?? null) : null;
  const linkClub = current?.clubId ? clubs[current.clubId] : undefined;
  const won = result?.winner === side;
  const turnKey = `${view.round}-${view.chain.length}`;

  useEffect(() => {
    strip.current?.scrollToEnd({ animated: true });
  }, [turnKey]);

  const status = (): { text: string; color: ThemeColor } => {
    const miss = view.miss;
    if (miss) {
      const said = miss.footballerId === null ? null : (chain.cards[miss.footballerId] ?? null);
      const local = said?.countryCode === chain.market.code.toUpperCase();
      const reason =
        miss.reason === 'timeout'
          ? uppercase(t('chain.timeout'))
          : uppercaseAround(t(miss.reason === 'used' ? 'chain.used' : 'chain.wrong', { name: NAME_SLOT }), said?.name ?? '?', local);
      const taker = uppercase(miss.side === side ? t('chain.roundToRival') : t('chain.roundToYou'));
      return { text: `${reason} · ${taker}`, color: miss.side === side ? 'negative' : 'positive' };
    }
    return myTurn
      ? { text: uppercase(t('chain.yourTurn')), color: 'volt' }
      : { text: uppercase(t('chain.opponentTurn')), color: 'textSecondary' };
  };
  const statusLine = status();

  return (
    <Screen
      contentStyle={styles.content}
      overlay={
        result ? (
          <ResultOverlay
            title={!result.winner ? t('match.draw') : t(won ? 'match.youWin' : 'match.youLose')}
            detail={result.reason === 'forfeit' ? t(won ? 'match.byForfeitWin' : 'match.byForfeitLoss') : t('chain.byScore')}
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
            {uppercase(t('chain.round', { round: view.round, target: view.roundsToWin }))}
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
              turnEndsAt={chain.deadlineAt}
              totalSeconds={view.turnSeconds}
              secondsLeft={playing ? secondsLeft : 0}
              color={urgent ? Colors.negative : playing ? Finishes[view.turn].base : Colors.strokeBright}
              running={playing}
              urgent={urgent}
              accessibilityLabel={t('match.secondsLeft', { seconds: secondsLeft })}
            />
          }
        />
      </Animated.View>

      <JokerBar scope={`${view.round}-${view.chain.length}`} available={() => myTurn} />

      <MetalPlate finish={null} cut="right" cutSize={20} radius={14} style={styles.plate}>
        <ThemedText style={styles.rule}>{uppercase(t('chain.rule'))}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('chain.scope')}
        </ThemedText>
      </MetalPlate>

      <ScrollView
        ref={strip}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        contentContainerStyle={styles.stripContent}>
        {previous.map((link, index) => {
          const next = view.chain[index + 1];
          const club = next?.clubId ? clubs[next.clubId] : undefined;
          return (
            <Animated.View key={`${view.round}-${link.footballerId}`} entering={FadeInRight.duration(Motion.base)} style={styles.stripItem}>
              <Node footballer={chain.cards[link.footballerId] ?? null} side={link.side} />
              <View style={styles.connector}>
                <View style={styles.connectorLine} />
                <ThemedText style={styles.connectorText} numberOfLines={1}>
                  {club ? nameUppercase(club.name, club.local) : ''}
                </ThemedText>
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>

      <View style={styles.current}>
        <ThemedText type="label" themeColor="textSecondary">
          {uppercase(t('chain.last'))}
        </ThemedText>
        {current ? (
          <FootballerCard
            key={`${view.round}-${current.footballerId}`}
            footballer={currentFootballer}
            side={current.side ?? view.turn}
            size={cardSize}
            emphasis="none"
            watermark={false}
          />
        ) : null}
        <View style={styles.via}>
          {current?.clubId ? <ClubCrest clubId={current.clubId} size={CREST_SIZE} /> : null}
          <ThemedText type="smallBold" themeColor="gold" style={styles.centered}>
            {linkClub ? t('chain.via', { club: nameUppercase(linkClub.name, linkClub.local) }) : ' '}
          </ThemedText>
        </View>
      </View>

      <View style={styles.status}>
        <ThemedText key={`${turnKey}-${statusLine.text}`} type="subtitle" themeColor={statusLine.color} style={styles.centered} accessibilityLiveRegion="polite">
          {statusLine.text}
        </ThemedText>
        {notice && !result ? (
          <ThemedText type="small" themeColor="gold" style={styles.centered}>
            {notice}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.action}>
        {canSay ? <ActionButton label={t('chain.say')} onPress={() => setSearching(view.chain.length)} /> : null}
      </View>

      {canSay && searching === view.chain.length && current ? (
        <FootballerSearch
          title={currentFootballer ? t('chain.searchTitle', { name: currentFootballer.name }) : ''}
          market={chain.market.code}
          secondsLeft={secondsLeft}
          excludedIds={chainCardIds(view)}
          onSelect={(footballer) => {
            setSearching(null);
            onAct({ kind: 'link', footballerId: footballer.id });
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
  rule: {
    fontFamily: Fonts.display,
    fontSize: 20,
    lineHeight: 22,
    color: Colors.text,
  },
  strip: {
    alignSelf: 'stretch',
    flexGrow: 0,
    minHeight: NODE_SIZE + 22,
  },
  stripContent: {
    alignItems: 'flex-start',
    paddingRight: Spacing.three,
  },
  stripItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  node: {
    width: 64,
    alignItems: 'center',
    gap: Spacing.half,
  },
  nodeBadge: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: Colors.panelRaised,
  },
  nodeInitials: {
    fontFamily: Fonts.display,
    fontSize: 16,
    lineHeight: NODE_SIZE - 4,
    textAlign: 'center',
  },
  nodeImage: {
    position: 'absolute',
    width: NODE_SIZE,
    height: NODE_SIZE,
    left: -2,
    top: -1,
  },
  nodeName: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.text,
  },
  connector: {
    width: 76,
    alignItems: 'stretch',
    paddingTop: NODE_SIZE / 2 - 1,
    gap: Spacing.half,
  },
  connectorLine: {
    height: 2,
    backgroundColor: Colors.gold,
  },
  connectorText: {
    textAlign: 'center',
    fontFamily: Fonts.label,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.4,
    color: Colors.gold,
  },
  current: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  status: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  via: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: CREST_SIZE,
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
