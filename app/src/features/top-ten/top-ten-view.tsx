import { opponentOf, type Side } from '@sportapps/game-core';
import { TOP_TEN_TURN_SECONDS, type RareAction, type TopTenListView } from '@sportapps/protocol';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInLeft } from 'react-native-reanimated';

import { ActionButton } from '@/components/action-button';
import { MetalPlate } from '@/components/metal-plate';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Finishes, Fonts, MinimumTouchSize, Motion, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { loadHeaderLabel } from '@/data/queries';
import type { HeaderView } from '@/data/types';
import { metricValueText } from '@/features/duel/labels';
import { FootballerSearch } from '@/features/match/footballer-search';
import { ResultOverlay } from '@/features/match/result-overlay';
import { Scoreboard } from '@/features/match/scoreboard';
import { TurnTimer } from '@/features/match/turn-timer';
import { URGENT_SECONDS } from '@/features/match/use-match-effects';
import type { OnlineTopTen } from '@/features/match/use-online-match';
import { haptics } from '@/feedback/haptics';
import { playSound } from '@/feedback/sounds';
import { NAME_SLOT, useNameUppercase, useUppercase, useUppercaseAround } from '@/i18n/uppercase';

const SIDES: readonly Side[] = ['x', 'o'];
const LIFE_SIZE = 12;
const RANK_SIZE = 30;

interface TopTenMatchViewProps {
  topTen: OnlineTopTen;
  secondsLeft: number;
  canAct: boolean;
  notice: string | null;
  playAgainLabel: string;
  onAct: (action: RareAction) => void;
  onPlayAgain: () => void;
  onQuit: () => void;
}

function useListSubject(list: TopTenListView, market: string): HeaderView | null {
  const database = useSQLiteContext();
  const { i18n } = useTranslation();
  const language = i18n.language;
  const header = list.kind === 'clubGoals' ? { kind: 'club' as const, referenceId: list.clubId } : { kind: 'country' as const, referenceId: list.countryId };
  const key = `${header.kind}-${header.referenceId}`;
  const [loaded, setLoaded] = useState<{ key: string; label: HeaderView } | null>(null);

  useEffect(() => {
    const [kind, reference] = key.split('-');
    let cancelled = false;
    void loadHeaderLabel(database, { kind: kind as 'club' | 'country', referenceId: Number(reference) }, market, language).then(
      (label) => {
        if (!cancelled) {
          setLoaded({ key, label });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [database, key, market, language]);

  return loaded?.key === key ? loaded.label : null;
}

function useTopTenEffects(topTen: OnlineTopTen, secondsLeft: number) {
  const { view, side } = topTen;
  const guesses = view.lastGuess ? `${view.round}-${view.scores.x}-${view.scores.o}-${view.lives.x}-${view.lives.o}` : null;
  const lastRank = view.lastGuess?.rank ?? null;
  const lastMine = view.lastGuess?.side === side;
  const myTurn = view.phase === 'playing' && view.turn === side;

  useEffect(() => {
    playSound('whistle');
  }, []);

  useEffect(() => {
    if (guesses === null) {
      return;
    }
    if (lastRank !== null) {
      playSound(lastMine ? 'correct' : 'impact');
      if (lastMine) {
        haptics.success();
      } else {
        haptics.tick();
      }
    } else {
      playSound('wrong');
      if (lastMine) {
        haptics.error();
      }
    }
  }, [guesses, lastRank, lastMine]);

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

export function TopTenMatchView({
  topTen,
  secondsLeft,
  canAct,
  notice,
  playAgainLabel,
  onAct,
  onPlayAgain,
  onQuit,
}: TopTenMatchViewProps) {
  const { t, i18n } = useTranslation();
  const uppercase = useUppercase();
  const nameUppercase = useNameUppercase();
  const uppercaseAround = useUppercaseAround();
  const [searching, setSearching] = useState<string | null>(null);
  const { view, side } = topTen;
  const rival = opponentOf(side);
  const subject = useListSubject(view.list, topTen.market.code);

  useTopTenEffects(topTen, secondsLeft);

  const { result } = view;
  const playing = view.phase === 'playing';
  const myTurn = playing && view.turn === side;
  const canName = myTurn && canAct;
  const urgent = myTurn && secondsLeft <= URGENT_SECONDS;
  const names = { [side]: t('match.you'), [rival]: topTen.usernames[rival] } as Record<Side, string>;
  const won = result?.winner === side;
  const subjectName = subject ? nameUppercase(subject.name, subject.local) : '';
  const titleKey = view.list.kind === 'value' ? 'topTen.listValue' : view.list.kind === 'goals' ? 'topTen.listGoals' : 'topTen.listClubGoals';
  const title = subject ? uppercase(t(titleKey, { name: '{}' })).split('{}').join(subjectName) : '';
  const turnKey = `${view.round}-${view.scores.x}-${view.scores.o}-${view.lives.x}-${view.lives.o}-${view.phase}`;
  const formatValue = (value: number) =>
    view.list.kind === 'value' ? metricValueText(t, 'marketValue', value, i18n.language) : t('topTen.goals', { goals: value });

  const status = (): { text: string; color: ThemeColor } => {
    if (!playing) {
      return { text: uppercase(t('topTen.listOver')), color: 'gold' };
    }
    const guess = view.lastGuess;
    if (guess) {
      const said = guess.footballerId === null ? null : (topTen.cards[guess.footballerId] ?? null);
      const local = said?.countryCode === topTen.market.code.toUpperCase();
      const mine = guess.side === side;
      if (guess.rank !== null) {
        return {
          text: uppercaseAround(t('topTen.hit', { name: NAME_SLOT, rank: guess.rank }), said?.name ?? '?', local),
          color: mine ? 'positive' : 'gold',
        };
      }
      return {
        text: said ? uppercaseAround(t('topTen.miss', { name: NAME_SLOT }), said.name, local) : uppercase(t('topTen.timeout')),
        color: mine ? 'negative' : 'textSecondary',
      };
    }
    return myTurn
      ? { text: uppercase(t('topTen.yourTurn')), color: 'volt' }
      : { text: uppercase(t('topTen.opponentTurn')), color: 'textSecondary' };
  };
  const current = status();

  return (
    <Screen
      contentStyle={styles.content}
      overlay={
        result ? (
          <ResultOverlay
            title={!result.winner ? t('match.draw') : t(won ? 'match.youWin' : 'match.youLose')}
            detail={result.reason === 'forfeit' ? t(won ? 'match.byForfeitWin' : 'match.byForfeitLoss') : t('topTen.byScore')}
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
            {uppercase(t('topTen.round', { round: view.round, total: view.totalRounds }))}
          </ThemedText>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(Motion.slow)} style={styles.stretch}>
        <Scoreboard
          names={names}
          scores={view.scores}
          activeSide={playing ? view.turn : null}
          compact
          center={
            <TurnTimer
              key={turnKey}
              turnEndsAt={topTen.deadlineAt}
              totalSeconds={TOP_TEN_TURN_SECONDS}
              secondsLeft={playing ? secondsLeft : 0}
              color={urgent ? Colors.negative : playing ? Finishes[view.turn].base : Colors.strokeBright}
              running={playing}
              urgent={urgent}
              accessibilityLabel={t('match.secondsLeft', { seconds: secondsLeft })}
            />
          }
        />
      </Animated.View>

      <View style={styles.lives}>
        {SIDES.map((lifeSide) => (
          <View key={lifeSide} style={styles.lifeRow} accessible accessibilityLabel={t('topTen.lives', { name: names[lifeSide], lives: view.lives[lifeSide] })}>
            {Array.from({ length: view.maxLives }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.life,
                  index < view.lives[lifeSide] && { backgroundColor: Finishes[lifeSide].base, borderColor: Finishes[lifeSide].light },
                ]}
              />
            ))}
          </View>
        ))}
      </View>

      <Animated.View key={view.round} entering={FadeInDown.duration(Motion.slow)} style={styles.stretch}>
        <MetalPlate finish={null} cut="right" cutSize={20} radius={14} style={styles.plate}>
          <ThemedText style={styles.title} accessibilityRole="header" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
            {title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('topTen.rule')}
          </ThemedText>
        </MetalPlate>
      </Animated.View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {view.entries.map((entry) => {
          const footballer = entry.footballerId === null ? null : topTen.cards[entry.footballerId];
          const owner = entry.foundBy;
          return (
            <View
              key={`${view.round}-${entry.rank}`}
              style={[styles.row, owner && { borderColor: Finishes[owner].base }]}
              accessible
              accessibilityLabel={footballer ? `${entry.rank}. ${footballer.name}` : `${entry.rank}. ?`}>
              <View style={[styles.rank, owner && { backgroundColor: Finishes[owner].base }]}>
                <ThemedText style={[styles.rankText, owner && { color: Finishes[owner].ink }]}>{String(entry.rank)}</ThemedText>
              </View>
              {footballer ? (
                <Animated.View entering={FadeInLeft.duration(Motion.base)} style={styles.rowBody}>
                  <ThemedText type="smallBold" numberOfLines={1} style={[styles.rowName, !owner && styles.unclaimed]}>
                    {footballer.name}
                  </ThemedText>
                  <ThemedText type="label" themeColor="textSecondary">
                    {entry.value === null ? '' : formatValue(entry.value)}
                  </ThemedText>
                </Animated.View>
              ) : (
                <ThemedText type="smallBold" themeColor="strokeBright" style={styles.rowName}>
                  ?
                </ThemedText>
              )}
            </View>
          );
        })}
      </ScrollView>

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
        {canName ? <ActionButton label={t('topTen.say')} onPress={() => setSearching(turnKey)} /> : null}
      </View>

      {canName && searching === turnKey ? (
        <FootballerSearch
          title={title}
          market={topTen.market.code}
          secondsLeft={secondsLeft}
          excludedIds={view.entries.flatMap((entry) => (entry.footballerId === null ? [] : [entry.footballerId]))}
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
    gap: Spacing.two,
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
  lives: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
  },
  lifeRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  life: {
    width: LIFE_SIZE,
    height: LIFE_SIZE,
    borderRadius: LIFE_SIZE / 2,
    borderWidth: 1.5,
    borderColor: Colors.strokeBright,
    backgroundColor: Colors.panel,
  },
  plate: {
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 22,
    lineHeight: 25,
    color: Colors.text,
  },
  list: {
    alignSelf: 'stretch',
    flexGrow: 0,
    maxHeight: 10 * 40,
  },
  listContent: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 36,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.small,
    borderWidth: 1,
    borderColor: Colors.stroke,
    backgroundColor: Colors.panel,
  },
  rank: {
    width: RANK_SIZE,
    height: RANK_SIZE - 6,
    borderRadius: Radius.small,
    alignItems: 'stretch',
    justifyContent: 'center',
    backgroundColor: Colors.panelRaised,
  },
  rankText: {
    fontFamily: Fonts.display,
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'center',
    color: Colors.text,
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowName: {
    flex: 1,
  },
  unclaimed: {
    color: Colors.textSecondary,
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
