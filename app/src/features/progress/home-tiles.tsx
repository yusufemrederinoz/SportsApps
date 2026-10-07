import { PUZZLE_GUESSES, type DailyPuzzleView } from '@sportapps/protocol';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { api } from '@/api';
import { useAuth } from '@/auth/auth-provider';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { resolveMarket } from '@/data/queries';
import { haptics } from '@/feedback/haptics';
import { useUppercase } from '@/i18n/uppercase';

function usePuzzleStatus(): DailyPuzzleView | null {
  const database = useSQLiteContext();
  const { i18n } = useTranslation();
  const { state } = useAuth();
  const token = state.status === 'signed-in' ? state.token : null;
  const language = i18n.language;
  const [puzzle, setPuzzle] = useState<DailyPuzzleView | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        return undefined;
      }
      let cancelled = false;
      void resolveMarket(database, language)
        .then((market) => (market ? api.puzzle(token, market.code) : null))
        .then((response) => {
          if (!cancelled && response) {
            setPuzzle(response.puzzle);
          }
        })
        .catch(() => undefined);
      return () => {
        cancelled = true;
      };
    }, [database, language, token]),
  );

  return puzzle;
}

interface TileProps {
  title: string;
  detail: string;
  accent: string;
  onPress: () => void;
}

function Tile({ title, detail, accent, onPress }: TileProps) {
  const uppercase = useUppercase();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${detail}`}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={({ pressed }) => [styles.tile, { borderTopColor: accent }, pressed && styles.tilePressed]}>
      <ThemedText style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {uppercase(title)}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
        {detail}
      </ThemedText>
    </Pressable>
  );
}

export function HomeTiles({ onPuzzle, onLeaderboard }: { onPuzzle: () => void; onLeaderboard: () => void }) {
  const { t } = useTranslation();
  const puzzle = usePuzzleStatus();
  const filled = puzzle ? puzzle.cells.filter((cell) => cell.footballerId !== null).length : 0;
  const started = puzzle !== null && puzzle.guessesLeft < PUZZLE_GUESSES;
  const puzzleDetail = !puzzle
    ? t('home.puzzleHint')
    : puzzle.finished
      ? t('home.puzzleDone', { score: puzzle.score })
      : started
        ? t('home.puzzleProgress', { filled, score: puzzle.score })
        : t('home.puzzleHint');

  return (
    <View style={styles.row}>
      <Tile
        title={puzzle ? `${t('home.puzzleTitle')} #${puzzle.number}` : t('home.puzzleTitle')}
        detail={puzzleDetail}
        accent={Colors.gold}
        onPress={onPuzzle}
      />
      <Tile title={t('home.leaderboardTitle')} detail={t('home.leaderboardHint')} accent={Colors.volt} onPress={onLeaderboard} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tile: {
    flex: 1,
    minHeight: 76,
    gap: Spacing.half,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderTopWidth: 3,
    borderColor: Colors.stroke,
    backgroundColor: Colors.panel,
  },
  tilePressed: {
    backgroundColor: Colors.panelRaised,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 0.5,
    color: Colors.text,
  },
});
