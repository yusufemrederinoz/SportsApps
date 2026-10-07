import { DEFAULT_RULES, type CellPosition } from '@sportapps/game-core';
import {
  PUZZLE_GUESSES,
  type DailyPuzzleView,
  type PuzzleGuessOutcome,
  type PuzzleRankingResponse,
} from '@sportapps/protocol';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { api } from '@/api';
import { errorCodeOf } from '@/api/client';
import { useAuth } from '@/auth/auth-provider';
import { EntryGate } from '@/auth/entry-gate';
import { ERROR_KEYS } from '@/auth/error-messages';
import { ActionButton } from '@/components/action-button';
import { GoalIcon } from '@/components/goal-icon';
import { MetalPlate } from '@/components/metal-plate';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { AccentFinishes, Colors, Fonts, MinimumTouchSize, Motion, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { loadFootballer, loadGrid, resolveMarket } from '@/data/queries';
import type { FootballerSummary, GridView, HeaderView, Market } from '@/data/types';
import { Board } from '@/features/match/board';
import { FootballerSearch } from '@/features/match/footballer-search';
import type { Claim, MatchSession, PlayedFootballer } from '@/features/match/session';
import { haptics } from '@/feedback/haptics';
import { playSound } from '@/feedback/sounds';
import { useNameUppercase, useUppercase } from '@/i18n/uppercase';

const BOARD_WIDTH = 3;
const VISIBLE_RANKS = 10;
const FILLED_MARK = '🟩';
const EMPTY_MARK = '⬛';

const OUTCOME_TEXT = {
  correct: { key: 'puzzle.correct', color: 'positive' },
  wrong: { key: 'puzzle.wrong', color: 'negative' },
  'already-used': { key: 'puzzle.alreadyUsed', color: 'gold' },
} as const satisfies Record<PuzzleGuessOutcome, { key: string; color: ThemeColor }>;

async function loadCards(
  database: Parameters<typeof loadFootballer>[0],
  puzzle: DailyPuzzleView,
): Promise<Record<number, PlayedFootballer>> {
  const ids = puzzle.cells.map((cell) => cell.footballerId).filter((id): id is number => id !== null);
  const loaded = await Promise.all(ids.map((id) => loadFootballer(database, id)));
  return Object.fromEntries(loaded.filter((card): card is FootballerSummary => card !== null).map((card) => [card.id, card]));
}

function shareGrid(puzzle: DailyPuzzleView): string {
  return Array.from({ length: BOARD_WIDTH }, (_, row) =>
    puzzle.cells
      .slice(row * BOARD_WIDTH, row * BOARD_WIDTH + BOARD_WIDTH)
      .map((cell) => (cell.footballerId === null ? EMPTY_MARK : FILLED_MARK))
      .join(''),
  ).join('\n');
}

function PuzzleScreen() {
  const database = useSQLiteContext();
  const { t, i18n } = useTranslation();
  const uppercase = useUppercase();
  const nameUppercase = useNameUppercase();
  const router = useRouter();
  const { state } = useAuth();
  const token = state.status === 'signed-in' ? state.token : null;
  const language = i18n.language;
  const [market, setMarket] = useState<Market | null>(null);
  const [puzzle, setPuzzle] = useState<DailyPuzzleView | null>(null);
  const [gridView, setGridView] = useState<GridView | null>(null);
  const [footballers, setFootballers] = useState<Record<number, PlayedFootballer>>({});
  const [selected, setSelected] = useState<CellPosition | null>(null);
  const [outcome, setOutcome] = useState<{ kind: PuzzleGuessOutcome; key: number } | null>(null);
  const [lastClaim, setLastClaim] = useState<Claim | null>(null);
  const [busy, setBusy] = useState(false);
  const [ranking, setRanking] = useState<PuzzleRankingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRanking = useCallback(
    (marketCode: string) => {
      if (!token) {
        return;
      }
      api
        .puzzleRanking(token, marketCode)
        .then(setRanking)
        .catch(() => undefined);
    },
    [token],
  );

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        return undefined;
      }
      let cancelled = false;
      const load = async () => {
        const resolved = await resolveMarket(database, language);
        if (!resolved) {
          throw new Error('market');
        }
        const response = await api.puzzle(token, resolved.code);
        const [grid, cards] = await Promise.all([
          loadGrid(database, response.puzzle.gridId, language),
          loadCards(database, response.puzzle),
        ]);
        if (cancelled) {
          return;
        }
        setMarket(resolved);
        setPuzzle(response.puzzle);
        setGridView(grid);
        setFootballers(cards);
        setError(null);
        if (response.puzzle.finished) {
          loadRanking(resolved.code);
        }
      };
      load().catch((failure: unknown) => {
        if (!cancelled) {
          setError(t(ERROR_KEYS[errorCodeOf(failure)] ?? 'puzzle.unavailable'));
        }
      });
      return () => {
        cancelled = true;
      };
    }, [database, language, loadRanking, t, token]),
  );

  const guess = async (cell: CellPosition, footballer: FootballerSummary) => {
    if (!token || !market || busy) {
      return;
    }
    setBusy(true);
    setSelected(null);
    try {
      const response = await api.puzzleGuess(token, { market: market.code, cell, footballerId: footballer.id });
      setFootballers((current) => ({ ...current, [footballer.id]: footballer }));
      setPuzzle(response.puzzle);
      setOutcome({ kind: response.outcome, key: PUZZLE_GUESSES - response.puzzle.guessesLeft });
      setError(null);
      if (response.outcome === 'correct') {
        haptics.success();
        playSound('correct');
        setLastClaim({ index: cell.row * BOARD_WIDTH + cell.column, side: 'x', turnNumber: PUZZLE_GUESSES - response.puzzle.guessesLeft });
      } else {
        haptics.error();
        playSound('wrong');
      }
      if (response.puzzle.finished) {
        playSound('win');
        loadRanking(market.code);
      }
    } catch (failure) {
      setError(t(ERROR_KEYS[errorCodeOf(failure)]));
    } finally {
      setBusy(false);
    }
  };

  const percent = (share: number) => new Intl.NumberFormat(language, { style: 'percent' }).format(share / 100);
  const session: MatchSession | null =
    puzzle && gridView
      ? {
          match: {
            grid: gridView.grid,
            rules: DEFAULT_RULES,
            cells: puzzle.cells.map((cell) => (cell.footballerId === null ? null : { side: 'x', footballerId: cell.footballerId })),
            turn: 'x',
            turnNumber: PUZZLE_GUESSES - puzzle.guessesLeft + 1,
            consecutiveMisses: 0,
            result: null,
          },
          footballers,
          feedback: null,
          lastClaim,
          turnEndsAt: 0,
        }
      : null;
  const headerTitle = (header: HeaderView) => nameUppercase(header.name, header.local);
  const selectedTitle =
    selected && gridView
      ? `${headerTitle(gridView.rows[selected.row] as HeaderView)} × ${headerTitle(gridView.columns[selected.column] as HeaderView)}`
      : '';
  const filled = puzzle ? puzzle.cells.filter((cell) => cell.footballerId !== null).length : 0;
  const used = puzzle ? puzzle.cells.map((cell) => cell.footballerId).filter((id): id is number => id !== null) : [];
  const outcomeText = outcome ? OUTCOME_TEXT[outcome.kind] : null;

  const share = () => {
    if (!puzzle) {
      return;
    }
    haptics.select();
    void Share.share({
      message: `${t('puzzle.shareText', { number: puzzle.number, filled, score: puzzle.score })}\n${shareGrid(puzzle)}`,
    });
  };

  return (
    <Screen contentStyle={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back} hitSlop={Spacing.two}>
          <ThemedText type="label" themeColor="textSecondary">
            {`‹ ${uppercase(t('account.back'))}`}
          </ThemedText>
        </Pressable>
        <View style={styles.titleRow}>
          <ThemedText type="title" accessibilityRole="header" style={styles.title}>
            {uppercase(t('puzzle.title'))}
          </ThemedText>
          {puzzle ? (
            <View style={styles.tag}>
              <ThemedText type="label" themeColor="onAccent">
                {t('puzzle.number', { number: puzzle.number })}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {error ? <ThemedText themeColor="negative">{error}</ThemedText> : null}

        {puzzle && gridView && session ? (
          <>
            <View style={styles.stats}>
              <View style={styles.pips} accessible accessibilityLabel={t('puzzle.guessesLeft', { guesses: puzzle.guessesLeft })}>
                {Array.from({ length: PUZZLE_GUESSES }, (_, index) => (
                  <View key={index} style={[styles.pip, index < puzzle.guessesLeft && styles.pipLeft]} />
                ))}
              </View>
              <ThemedText type="label" themeColor="volt">
                {uppercase(t('puzzle.guessesLeft', { guesses: puzzle.guessesLeft }))}
              </ThemedText>
              <ThemedText style={styles.score}>{uppercase(t('puzzle.score', { score: puzzle.score }))}</ThemedText>
            </View>
            {!puzzle.finished ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('puzzle.rule')}
              </ThemedText>
            ) : null}

            <Board
              gridView={gridView}
              session={session}
              disabled={puzzle.finished || busy}
              selected={selected}
              cellCaption={(index) => {
                const cell = puzzle.cells[index];
                return cell && cell.share !== null ? percent(cell.share) : null;
              }}
              onSelectCell={setSelected}
            />

            {outcomeText && outcome ? (
              <Animated.View key={outcome.key} entering={ZoomIn.duration(Motion.base)}>
                <ThemedText type="subtitle" themeColor={outcomeText.color} style={styles.centered} accessibilityLiveRegion="polite">
                  {uppercase(t(outcomeText.key))}
                </ThemedText>
              </Animated.View>
            ) : null}

            {puzzle.finished ? (
              <Animated.View entering={FadeInDown.duration(Motion.slow)} style={styles.section}>
                <MetalPlate finish={AccentFinishes.volt} cut="right" cutSize={22} radius={16} style={styles.summary}>
                  <ThemedText type="label" style={styles.summaryInk}>
                    {uppercase(t('puzzle.finished'))}
                  </ThemedText>
                  <ThemedText style={styles.summaryScore}>{uppercase(t('puzzle.score', { score: puzzle.score }))}</ThemedText>
                  <ThemedText type="label" style={styles.summaryInk}>
                    {`${filled}/${PUZZLE_GUESSES} · ${uppercase(t('puzzle.players', { players: puzzle.players }))}`}
                  </ThemedText>
                  {puzzle.rewardGoals ? (
                    <View style={styles.reward}>
                      <GoalIcon size={20} />
                      <ThemedText style={styles.rewardText}>{t('puzzle.reward', { goals: puzzle.rewardGoals })}</ThemedText>
                    </View>
                  ) : null}
                </MetalPlate>
                <ActionButton label={t('puzzle.share')} onPress={share} />
                <ThemedText type="small" themeColor="textSecondary" style={styles.centered}>
                  {t('puzzle.tomorrow')}
                </ThemedText>
                {ranking ? (
                  <View style={styles.section}>
                    <ThemedText type="label" themeColor="textSecondary">
                      {uppercase(t('puzzle.ranking'))}
                    </ThemedText>
                    {[
                      ...ranking.entries.slice(0, VISIBLE_RANKS),
                      ...(ranking.you && ranking.you.rank > VISIBLE_RANKS ? [ranking.you] : []),
                    ].map((entry) => (
                      <View key={`${entry.rank}-${entry.username}`} style={[styles.rankRow, entry.you && styles.rankRowYou]}>
                        <ThemedText style={styles.rankNumber}>{entry.rank}</ThemedText>
                        <ThemedText type="smallBold" numberOfLines={1} style={styles.rankName}>
                          {entry.username}
                        </ThemedText>
                        <ThemedText type="label" themeColor="textSecondary">{`${entry.filled}/${PUZZLE_GUESSES}`}</ThemedText>
                        <ThemedText style={styles.rankScore}>{entry.score}</ThemedText>
                      </View>
                    ))}
                  </View>
                ) : null}
              </Animated.View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {selected && puzzle && !puzzle.finished ? (
        <FootballerSearch
          title={selectedTitle}
          market={market?.code ?? ''}
          secondsLeft={null}
          excludedIds={used}
          onClose={() => setSelected(null)}
          onSelect={(footballer) => void guess(selected, footballer)}
        />
      ) : null}
    </Screen>
  );
}

export default function PuzzleRoute() {
  return (
    <EntryGate allow="app">
      <PuzzleScreen />
    </EntryGate>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 0,
  },
  content: {
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  back: {
    minHeight: MinimumTouchSize,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  title: {
    flex: 1,
  },
  tag: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.small,
    backgroundColor: Colors.volt,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  pips: {
    flexDirection: 'row',
    gap: 4,
  },
  pip: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.stroke,
  },
  pipLeft: {
    backgroundColor: Colors.volt,
  },
  score: {
    marginLeft: 'auto',
    fontFamily: Fonts.display,
    fontSize: 22,
    lineHeight: 24,
    color: Colors.gold,
  },
  centered: {
    textAlign: 'center',
  },
  section: {
    gap: Spacing.three,
  },
  summary: {
    padding: Spacing.four,
    gap: Spacing.one,
  },
  summaryInk: {
    color: AccentFinishes.volt.ink,
  },
  summaryScore: {
    fontFamily: Fonts.display,
    fontSize: 48,
    lineHeight: 50,
    color: AccentFinishes.volt.ink,
  },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    backgroundColor: Colors.ink,
  },
  rewardText: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.gold,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: MinimumTouchSize,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Colors.stroke,
    backgroundColor: Colors.panel,
  },
  rankRowYou: {
    borderColor: Colors.volt,
    borderWidth: 1.5,
  },
  rankNumber: {
    minWidth: 24,
    fontFamily: Fonts.display,
    fontSize: 18,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  rankName: {
    flex: 1,
  },
  rankScore: {
    minWidth: 48,
    textAlign: 'right',
    fontFamily: Fonts.display,
    fontSize: 20,
    lineHeight: 22,
    color: Colors.text,
  },
});
