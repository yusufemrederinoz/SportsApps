import { normalizeRoomCode, type GameId } from '@sportapps/protocol';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { EntryGate } from '@/auth/entry-gate';
import { ActionButton } from '@/components/action-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Difficulty } from '@/data/types';
import { ChainMatchView } from '@/features/chain/chain-view';
import { DraftMatchView } from '@/features/draft/draft-view';
import { DuelMatchView } from '@/features/duel/duel-view';
import { HigherMatchView } from '@/features/higher/higher-view';
import { RareMatchView } from '@/features/rare/rare-view';
import { parseGame } from '@/features/games';
import { DIFFICULTY_LABELS, parseDifficulty } from '@/features/match/difficulty';
import { MatchView } from '@/features/match/match-view';
import { OnlineLobby } from '@/features/match/online-lobby';
import { BOT_SIDE, useMatch, type MatchMode } from '@/features/match/use-match';
import { useOnlineMatch, type OnlineEntry } from '@/features/match/use-online-match';
import { useUppercase } from '@/i18n/uppercase';

function LocalMatch({ mode, difficulty }: { mode: MatchMode; difficulty: Difficulty }) {
  const { t } = useTranslation();
  const uppercase = useUppercase();
  const router = useRouter();
  const { unavailable, setup, session, secondsLeft, canPlay, answer, restart } = useMatch(mode, difficulty);

  if (unavailable || !setup || !session) {
    return (
      <Screen contentStyle={styles.centeredContent}>
        <ThemedText type="label" themeColor="textSecondary">
          {uppercase(t(unavailable ? 'match.unavailable' : 'match.loading'))}
        </ThemedText>
        {unavailable ? <ActionButton label={t('match.home')} onPress={() => router.back()} variant="secondary" /> : null}
      </Screen>
    );
  }

  const { match } = session;
  const { result } = match;
  const names =
    mode === 'bot'
      ? { x: BOT_SIDE === 'x' ? t('match.bot') : t('match.you'), o: BOT_SIDE === 'o' ? t('match.bot') : t('match.you') }
      : { x: t('match.sideX'), o: t('match.sideO') };
  const resultTitle = !result?.winner
    ? t('match.draw')
    : mode === 'bot'
      ? t(result.winner === BOT_SIDE ? 'match.youLose' : 'match.youWin')
      : t('match.winner', { name: names[result.winner] });

  return (
    <MatchView
      gridView={setup.gridView}
      marketCode={setup.market.code}
      session={session}
      secondsLeft={secondsLeft}
      canPlay={canPlay}
      names={names}
      opponentSide={mode === 'bot' ? BOT_SIDE : null}
      tag={t(DIFFICULTY_LABELS[difficulty])}
      turnLabel={t('match.turn', { name: names[match.turn] })}
      resultTitle={resultTitle}
      resultDetail={t(result?.reason === 'line' ? 'match.byLine' : 'match.byCells')}
      playAgainLabel={t('match.playAgain')}
      onAnswer={(position, footballer) => void answer(position, footballer)}
      onPlayAgain={restart}
      onQuit={() => router.back()}
    />
  );
}

function OnlineMatch({ entry, difficulty, game }: { entry: OnlineEntry; difficulty: Difficulty; game: GameId }) {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useOnlineMatch(entry, difficulty, game);
  const { setup, session, live } = online;
  const notice = online.reconnecting
    ? t('online.reconnecting')
    : online.opponentConnected
      ? null
      : t('online.opponentAway');
  const playAgainLabel = t(entry.kind === 'queue' ? 'match.newOpponent' : 'match.playAgain');
  const playAgain =
    entry.kind === 'queue'
      ? online.playAgain
      : () => router.replace({ pathname: '/friend', params: { difficulty: String(difficulty), game } });

  if (online.phase === 'playing' && live?.game === 'rare') {
    return (
      <RareMatchView
        rare={live}
        secondsLeft={online.liveSecondsLeft}
        canAct={online.canAct}
        notice={notice}
        playAgainLabel={playAgainLabel}
        onAct={online.act}
        onPlayAgain={playAgain}
        onQuit={() => router.back()}
      />
    );
  }

  if (online.phase === 'playing' && live?.game === 'chain') {
    return (
      <ChainMatchView
        chain={live}
        secondsLeft={online.liveSecondsLeft}
        canAct={online.canAct}
        notice={notice}
        playAgainLabel={playAgainLabel}
        onAct={online.act}
        onPlayAgain={playAgain}
        onQuit={() => router.back()}
      />
    );
  }

  if (online.phase === 'playing' && live?.game === 'higher') {
    return (
      <HigherMatchView
        higher={live}
        secondsLeft={online.liveSecondsLeft}
        canAct={online.canAct}
        notice={notice}
        playAgainLabel={playAgainLabel}
        onAct={online.act}
        onPlayAgain={playAgain}
        onQuit={() => router.back()}
      />
    );
  }

  if (online.phase === 'playing' && live?.game === 'draft') {
    return (
      <DraftMatchView
        draft={live}
        secondsLeft={online.liveSecondsLeft}
        canAct={online.canAct}
        notice={notice}
        playAgainLabel={playAgainLabel}
        onAct={online.act}
        onPlayAgain={playAgain}
        onQuit={() => router.back()}
      />
    );
  }

  if (online.phase === 'playing' && live?.game === 'duel') {
    return (
      <DuelMatchView
        duel={live}
        secondsLeft={online.liveSecondsLeft}
        canAct={online.canAct}
        notice={notice}
        playAgainLabel={playAgainLabel}
        onAct={online.act}
        onPlayAgain={playAgain}
        onQuit={() => router.back()}
      />
    );
  }

  if (online.phase !== 'playing' || !setup || !session) {
    return (
      <OnlineLobby
        phase={online.phase === 'playing' ? 'connecting' : online.phase}
        failure={online.failure}
        roomCode={online.roomCode}
        onLeave={() => router.back()}
      />
    );
  }

  const { match } = session;
  const { result } = match;
  const rival = setup.side === 'x' ? 'o' : 'x';
  const names = { [setup.side]: t('match.you'), [rival]: setup.usernames[rival] } as Record<'x' | 'o', string>;
  const won = result?.winner === setup.side;
  const resultTitle = !result?.winner ? t('match.draw') : t(won ? 'match.youWin' : 'match.youLose');
  const resultDetail =
    result?.reason === 'forfeit'
      ? t(won ? 'match.byForfeitWin' : 'match.byForfeitLoss')
      : t(result?.reason === 'line' ? 'match.byLine' : 'match.byCells');

  return (
    <MatchView
      gridView={setup.gridView}
      marketCode={setup.market.code}
      session={session}
      secondsLeft={online.secondsLeft}
      canPlay={online.canPlay}
      names={names}
      opponentSide={rival}
      tag={t(DIFFICULTY_LABELS[setup.difficulty])}
      turnLabel={match.turn === setup.side ? t('match.turnYours') : t('match.turn', { name: names[rival] })}
      resultTitle={resultTitle}
      resultDetail={resultDetail}
      playAgainLabel={playAgainLabel}
      notice={notice}
      onAnswer={online.answer}
      onPlayAgain={playAgain}
      onQuit={() => router.back()}
    />
  );
}

function onlineEntry(entry: string | undefined, code: string | undefined): OnlineEntry {
  if (entry === 'host') {
    return { kind: 'host' };
  }
  return entry === 'join' ? { kind: 'join', code: normalizeRoomCode(code ?? '') } : { kind: 'queue' };
}

export default function MatchRoute() {
  const params = useLocalSearchParams<{
    mode?: string;
    difficulty?: string;
    entry?: string;
    code?: string;
    game?: string;
  }>();
  const difficulty = parseDifficulty(params.difficulty);

  return (
    <EntryGate allow="app">
      {params.mode === 'online' ? (
        <OnlineMatch entry={onlineEntry(params.entry, params.code)} difficulty={difficulty} game={parseGame(params.game)} />
      ) : (
        <LocalMatch mode={params.mode === 'bot' ? 'bot' : 'local'} difficulty={difficulty} />
      )}
    </EntryGate>
  );
}

const styles = StyleSheet.create({
  centeredContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
});
