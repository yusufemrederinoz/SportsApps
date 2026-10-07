import { opponentOf, openPositions, type DraftSlot, type Side } from '@sportapps/game-core';
import { DRAFT_PICK_SECONDS, type DraftAction } from '@sportapps/protocol';
import { useSQLiteContext } from 'expo-sqlite';
import { use, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ActionButton } from '@/components/action-button';
import { MetalPlate } from '@/components/metal-plate';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MinimumTouchSize, Motion, Spacing, type ThemeColor } from '@/constants/theme';
import { loadClubLabel } from '@/data/queries';
import type { ClubLabel } from '@/data/types';
import { JokerBar } from '@/features/jokers/joker-bar';
import { JokerContext, ownReveals } from '@/features/jokers/joker-context';
import { FootballerSearch } from '@/features/match/footballer-search';
import { ResultOverlay } from '@/features/match/result-overlay';
import { Scoreboard } from '@/features/match/scoreboard';
import { TurnTimer } from '@/features/match/turn-timer';
import { URGENT_SECONDS } from '@/features/match/use-match-effects';
import type { OnlineDraft } from '@/features/match/use-online-match';
import { NAME_SLOT, useNameUppercase, useUppercase, useUppercaseAround } from '@/i18n/uppercase';

import { draftCardIds } from './online';
import { LineupBoard } from './lineup-board';
import { useDraftEffects } from './use-draft-effects';

const SLOT_HEIGHT_SHARE = 0.058;
const MAXIMUM_SLOT_SIZE = 60;
const SIDES: readonly Side[] = ['x', 'o'];

interface DraftMatchViewProps {
  draft: OnlineDraft;
  secondsLeft: number;
  canAct: boolean;
  notice: string | null;
  playAgainLabel: string;
  onAct: (action: DraftAction) => void;
  onPlayAgain: () => void;
  onQuit: () => void;
}

function useClubLabel(clubId: number | null, market: string): ClubLabel | null {
  const database = useSQLiteContext();
  const { i18n } = useTranslation();
  const language = i18n.language;
  const [label, setLabel] = useState<ClubLabel | null>(null);

  useEffect(() => {
    if (clubId === null) {
      return;
    }
    let cancelled = false;
    void loadClubLabel(database, clubId, market, language).then((loaded) => {
      if (!cancelled) {
        setLabel(loaded);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [database, clubId, market, language]);

  return label?.id === clubId ? label : null;
}

export function DraftMatchView({
  draft,
  secondsLeft,
  canAct,
  notice,
  playAgainLabel,
  onAct,
  onPlayAgain,
  onQuit,
}: DraftMatchViewProps) {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const nameUppercase = useNameUppercase();
  const uppercaseAround = useUppercaseAround();
  const { height } = useWindowDimensions();
  const [searching, setSearching] = useState<number | null>(null);
  const { view, side } = draft;
  const rival = opponentOf(side);
  const clubId = view.clubs.at(-1) ?? null;
  const club = useClubLabel(clubId, draft.market.code);

  useDraftEffects(view, side, secondsLeft);

  const { result } = view;
  const running = view.phase === 'playing';
  const jokers = use(JokerContext);
  const showAssists =
    jokers !== null &&
    ownReveals(jokers).some((entry) => entry.reveal?.kind === 'assists' && entry.reveal.round === view.round);
  const ownPicked = view.picked[side];
  const canPick = running && !ownPicked && canAct;
  const urgent = running && !ownPicked && secondsLeft <= URGENT_SECONDS;
  const slotSize = Math.floor(Math.min(MAXIMUM_SLOT_SIZE, height * SLOT_HEIGHT_SHARE));
  const names = { [side]: t('match.you'), [rival]: draft.usernames[rival] } as Record<Side, string>;
  const clubTitle = club ? nameUppercase(club.name, club.local) : '';
  const won = result?.winner === side;
  const roundKey = `${view.round}-${view.phase}`;
  const rivalPick = view.lineups[rival].find((slot) => slot.round === view.round - 1 && slot.footballerId !== null);
  const rivalFootballer = rivalPick?.footballerId ? (draft.cards[rivalPick.footballerId] ?? null) : null;

  const status = (): { text: string; color: ThemeColor } => {
    if (view.phase === 'pause') {
      return { text: uppercase(t('draft.roundOver')), color: 'textSecondary' };
    }
    if (ownPicked) {
      const own = view.lineups[side].some((slot) => slot.round === view.round - 1);
      if (!own) {
        return { text: uppercase(t('draft.passed')), color: 'negative' };
      }
      return { text: uppercase(t(view.picked[rival] ? 'draft.roundOver' : 'draft.waitingOpponent')), color: 'textSecondary' };
    }
    if (rivalFootballer) {
      return {
        text: uppercaseAround(
          t('draft.opponentPicked', { name: NAME_SLOT }),
          rivalFootballer.name,
          rivalFootballer.countryCode === draft.market.code.toUpperCase(),
        ),
        color: 'gold',
      };
    }
    return { text: uppercase(t('draft.pickHint')), color: 'volt' };
  };
  const current = status();

  return (
    <Screen
      contentStyle={styles.content}
      overlay={
        result ? (
          <ResultOverlay
            title={!result.winner ? t('match.draw') : t(won ? 'match.youWin' : 'match.youLose')}
            detail={result.reason === 'forfeit' ? t(won ? 'match.byForfeitWin' : 'match.byForfeitLoss') : t('draft.byScore')}
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
            {uppercase(t('draft.round', { round: view.round, total: view.totalRounds }))}
          </ThemedText>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(Motion.slow)} style={styles.stretch}>
        <Scoreboard
          names={names}
          scores={view.scores}
          activeSide={running ? (ownPicked ? (view.picked[rival] ? null : rival) : side) : null}
          compact
          center={
            <TurnTimer
              turnEndsAt={draft.deadlineAt}
              totalSeconds={DRAFT_PICK_SECONDS}
              secondsLeft={running ? secondsLeft : 0}
              color={urgent ? Colors.negative : running ? Colors.volt : Colors.strokeBright}
              running={running}
              urgent={urgent}
              accessibilityLabel={t('match.secondsLeft', { seconds: secondsLeft })}
            />
          }
        />
      </Animated.View>

      <JokerBar scope={view.round} available={() => running && !view.picked[side]} />

      <Animated.View key={view.round} entering={FadeInDown.duration(Motion.slow)} style={styles.stretch}>
        <MetalPlate finish={null} cut="right" cutSize={20} radius={14} style={styles.plate}>
          <ThemedText type="label" themeColor="volt">
            {uppercase(t('draft.clubLabel'))}
          </ThemedText>
          <ThemedText style={styles.club} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {clubTitle}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('draft.target')}
          </ThemedText>
        </MetalPlate>
      </Animated.View>

      <View style={styles.boards}>
        {SIDES.map((boardSide) => (
          <LineupBoard
            key={boardSide}
            side={boardSide}
            name={names[boardSide]}
            lineup={view.lineups[boardSide]}
            cards={draft.cards}
            slotSize={slotSize}
            active={running && !view.picked[boardSide]}
          />
        ))}
      </View>

      <View style={styles.status}>
        <ThemedText key={`${roundKey}-${current.text}`} type="subtitle" themeColor={current.color} style={styles.centered} accessibilityLiveRegion="polite">
          {current.text}
        </ThemedText>
        {notice && !result ? (
          <ThemedText type="small" themeColor="gold" style={styles.centered} accessibilityLiveRegion="polite">
            {notice}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.action}>
        {canPick ? <ActionButton label={t('draft.choose')} onPress={() => setSearching(view.round)} /> : null}
      </View>

      {canPick && searching === view.round && clubId !== null ? (
        <FootballerSearch
          title={clubTitle}
          market={draft.market.code}
          secondsLeft={secondsLeft}
          excludedIds={draftCardIds(view)}
          filter={{
            kind: 'draft',
            clubId,
            positions: openPositions(view.lineups[side] as readonly DraftSlot[]),
            excludedIds: draftCardIds(view),
          }}
          emptyLabel={t('draft.searchEmpty')}
          showAssists={showAssists}
          onSelect={(footballer) => {
            setSearching(null);
            onAct({ kind: 'pick', footballerId: footballer.id });
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
  club: {
    fontFamily: Fonts.display,
    fontSize: 30,
    lineHeight: 32,
    color: Colors.text,
  },
  boards: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  status: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    gap: Spacing.one,
    minHeight: 32,
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
