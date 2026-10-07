import type { CellPosition, Side } from '@sportapps/game-core';
import type { PlayErrorCode, ServerMessage } from '@sportapps/protocol';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { apiUrl } from '@/api';
import version from '@/assets/data/version.json';
import { useAuth } from '@/auth/auth-provider';
import { loadFootballer, loadGrid, resolveMarket } from '@/data/queries';
import type { Difficulty, FootballerSummary, GridView, Market } from '@/data/types';
import { createPlayClient, playUrl, type PlayClient } from '@/online/play-client';

import {
  applyMove,
  finishSession,
  footballerIdsOf,
  sessionFromSnapshot,
  unknownFootballer,
} from './online';
import { secondsLeft, type MatchSession, type PlayedFootballer } from './session';

export type OnlineEntry = { kind: 'queue' } | { kind: 'host' } | { kind: 'join'; code: string };
export type OnlinePhase = 'connecting' | 'searching' | 'hosting' | 'playing' | 'failed';
export type OnlineFailure = PlayErrorCode | 'offline' | 'signed-out' | 'room-closed';

export interface OnlineSetup {
  matchId: string;
  market: Market;
  gridView: GridView;
  difficulty: Difficulty;
  side: Side;
  usernames: Record<Side, string>;
}

const TICK_MILLISECONDS = 250;
const BLOCKING_ERRORS: readonly PlayErrorCode[] = [
  'unauthorized',
  'outdated-client',
  'replaced',
  'no-grid',
  'room-not-found',
];

export function useOnlineMatch(entry: OnlineEntry, difficulty: Difficulty) {
  const database = useSQLiteContext();
  const { i18n } = useTranslation();
  const language = i18n.language;
  const { state: auth } = useAuth();
  const token = auth.status === 'signed-in' ? auth.token : null;
  const entryKind = entry.kind;
  const entryCode = entry.kind === 'join' ? entry.code : '';
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<OnlinePhase>('connecting');
  const [failure, setFailure] = useState<OnlineFailure | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [setup, setSetup] = useState<OnlineSetup | null>(null);
  const [session, setSession] = useState<MatchSession | null>(null);
  const [opponentConnected, setOpponentConnected] = useState(true);
  const [reconnecting, setReconnecting] = useState(false);
  const [sentTurn, setSentTurn] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const client = useRef<PlayClient | null>(null);

  useEffect(() => {
    if (!token || !apiUrl) {
      return;
    }
    const url = playUrl(apiUrl);
    let disposed = false;
    let playing = false;
    let finished = false;
    let matchId: string | null = null;
    let market: Market | null = null;
    let connection: PlayClient | null = null;
    let chain: Promise<void> = Promise.resolve();
    const footballers = new Map<number, PlayedFootballer>();
    const lookup = (footballerId: number) => footballers.get(footballerId) ?? unknownFootballer(footballerId);

    const remember = async (footballerIds: readonly number[]) => {
      for (const footballerId of footballerIds) {
        if (!footballers.has(footballerId)) {
          const found = await loadFootballer(database, footballerId);
          footballers.set(
            footballerId,
            found
              ? { id: found.id, name: found.name, countryCode: found.countryCode, role: found.role }
              : unknownFootballer(footballerId),
          );
        }
      }
    };

    const fail = (reason: OnlineFailure) => {
      setFailure(reason);
      setPhase('failed');
    };

    const sendEntry = () => {
      if (!market || !connection) {
        return;
      }
      if (entryKind === 'join') {
        connection.send({ type: 'join-room', code: entryCode });
      } else {
        connection.send({ type: entryKind === 'host' ? 'create-room' : 'queue', market: market.code, difficulty });
      }
    };

    const handle = async (message: ServerMessage, receivedAt: number) => {
      switch (message.type) {
        case 'ready':
          setReconnecting(false);
          if (!playing && !finished) {
            sendEntry();
          }
          return;
        case 'queued':
          setPhase('searching');
          return;
        case 'room':
          setRoomCode(message.code);
          setPhase('hosting');
          return;
        case 'idle':
          if (!playing && !finished) {
            fail('room-closed');
          }
          return;
        case 'match': {
          const snapshot = message.match;
          const gridView = await loadGrid(database, snapshot.gridId, language);
          if (!gridView || !market) {
            fail('outdated-client');
            return;
          }
          await remember(footballerIdsOf(snapshot.moves));
          if (disposed) {
            return;
          }
          matchId = snapshot.matchId;
          playing = snapshot.result === null;
          finished = snapshot.result !== null;
          setSetup({
            matchId: snapshot.matchId,
            market,
            gridView,
            difficulty: snapshot.difficulty,
            side: snapshot.side,
            usernames: snapshot.usernames,
          });
          setSession(sessionFromSnapshot(snapshot, gridView.grid, lookup, receivedAt));
          setOpponentConnected(snapshot.opponentConnected);
          setSentTurn(null);
          setNow(Date.now());
          setPhase('playing');
          return;
        }
        case 'move': {
          if (message.matchId !== matchId) {
            return;
          }
          const { move } = message;
          if (move.kind === 'answer') {
            await remember([move.footballerId]);
          }
          if (disposed) {
            return;
          }
          setSession((current) => current && applyMove(current, move, lookup, receivedAt + message.turnEndsIn));
          setSentTurn(null);
          return;
        }
        case 'finished':
          if (message.matchId === matchId) {
            playing = false;
            finished = true;
            setSession((current) => current && finishSession(current, message.result));
          }
          return;
        case 'opponent':
          if (message.matchId === matchId) {
            setOpponentConnected(message.connected);
          }
          return;
        case 'error':
          if (BLOCKING_ERRORS.includes(message.code)) {
            fail(message.code);
          } else {
            setSentTurn(null);
          }
          return;
        case 'pong':
          return;
      }
    };

    const start = async () => {
      market = await resolveMarket(database, language);
      if (disposed) {
        return;
      }
      if (!market) {
        fail('no-grid');
        return;
      }
      connection = createPlayClient({
        url,
        token,
        dataVersion: version.dataVersion,
        onMessage: (message) => {
          const receivedAt = Date.now();
          chain = chain
            .then(() => (disposed ? undefined : handle(message, receivedAt)))
            .catch(() => undefined);
        },
        onStatus: (status) => {
          if (disposed) {
            return;
          }
          if (status === 'reconnecting') {
            setReconnecting(true);
          } else if (status === 'closed' && !finished) {
            setFailure((current) => current ?? 'offline');
            setPhase('failed');
          }
        },
      });
      client.current = connection;
    };
    void start();

    return () => {
      disposed = true;
      if (connection) {
        if (playing && matchId) {
          connection.send({ type: 'leave', matchId });
        } else if (!finished) {
          connection.send({ type: 'cancel' });
        }
        connection.close();
      }
      if (client.current === connection) {
        client.current = null;
      }
    };
  }, [token, database, language, entryKind, entryCode, difficulty, round]);

  const unavailable: OnlineFailure | null = !token ? 'signed-out' : !apiUrl ? 'offline' : null;
  const active = phase === 'playing' && session !== null && session.match.result === null;

  useEffect(() => {
    if (!active) {
      return;
    }
    const interval = setInterval(() => setNow(Date.now()), TICK_MILLISECONDS);
    return () => clearInterval(interval);
  }, [active]);

  const ownTurn = active && setup !== null && session.match.turn === setup.side;
  const canPlay = ownTurn && !reconnecting && sentTurn !== session.match.turnNumber;

  const answer = (position: CellPosition, footballer: FootballerSummary) => {
    if (!canPlay || !setup || !session) {
      return;
    }
    const turnNumber = session.match.turnNumber;
    const sent = client.current?.send({
      type: 'answer',
      matchId: setup.matchId,
      turnNumber,
      cell: { row: position.row, column: position.column },
      footballerId: footballer.id,
    });
    if (sent) {
      setSentTurn(turnNumber);
    }
  };

  const playAgain = () => {
    setSession(null);
    setSetup(null);
    setRoomCode(null);
    setFailure(null);
    setSentTurn(null);
    setReconnecting(false);
    setOpponentConnected(true);
    setPhase('connecting');
    setRound((current) => current + 1);
  };

  return {
    phase: unavailable ? ('failed' as const) : phase,
    failure: unavailable ?? failure,
    roomCode,
    setup,
    session,
    opponentConnected,
    reconnecting,
    secondsLeft: session ? secondsLeft(session, now) : 0,
    canPlay,
    answer,
    playAgain,
  };
}
