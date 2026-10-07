import { normalizeRoomCode } from '@sportapps/protocol';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { EntryGate } from '@/auth/entry-gate';
import { ActionButton } from '@/components/action-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Difficulty } from '@/data/types';
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

function OnlineMatch({ entry, difficulty }: { entry: OnlineEntry; difficulty: Difficulty }) {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useOnlineMatch(entry, difficulty);
  const { setup, session } = online;

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
  const notice = online.reconnecting
    ? t('online.reconnecting')
    : online.opponentConnected
      ? null
      : t('online.opponentAway');

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
      playAgainLabel={t(entry.kind === 'queue' ? 'match.newOpponent' : 'match.playAgain')}
      notice={notice}
      onAnswer={online.answer}
      onPlayAgain={entry.kind === 'queue' ? online.playAgain : () => router.replace('/friend')}
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
  const params = useLocalSearchParams<{ mode?: string; difficulty?: string; entry?: string; code?: string }>();
  const difficulty = parseDifficulty(params.difficulty);

  return (
    <EntryGate allow="app">
      {params.mode === 'online' ? (
        <OnlineMatch entry={onlineEntry(params.entry, params.code)} difficulty={difficulty} />
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
