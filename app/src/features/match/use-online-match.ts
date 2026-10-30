import type { CellPosition, Side } from '@sportapps/game-core';
import { EXTRA_TIME_SECONDS, REACTION_COOLDOWN_MILLISECONDS, REMATCH_WINDOW_MILLISECONDS } from '@sportapps/protocol';
import type {
  AuctionView,
  CareerView,
  ChainView,
  DraftView,
  DuelView,
  GameAction,
  HigherView,
  RareView,
  TopTenView,
  GameId,
  GameView,
  JokerId,
  JokerTarget,
  JokerUse,
  PlayErrorCode,
  PointsChange,
  ReactionId,
  RematchState,
  ServerMessage,
} from '@sportapps/protocol';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { apiUrl } from '@/api';
import { activeDataVersion } from '@/data/data-version';
import { useAuth } from '@/auth/auth-provider';
import { loadFootballer, loadGrid, resolveMarket } from '@/data/queries';
import type { Difficulty, FootballerSummary, GridView, Market } from '@/data/types';
import { gameCardIds, finishGameView } from '@/features/games';
import { createPlayClient, playUrl, type PlayClient } from '@/online/play-client';

import {
  applyMove,
  finishSession,
  footballerIdsOf,
  sessionFromSnapshot,
  unknownFootballer,
} from './online';
import { secondsLeft, type MatchSession, type PlayedFootballer } from './session';

export type OnlineEntry = { kind: 'queue' } | { kind: 'bot' } | { kind: 'host' } | { kind: 'join'; code: string };
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

interface OnlineSessionBase {
  matchId: string;
  market: Market;
  difficulty: Difficulty;
  side: Side;
  usernames: Record<Side, string>;
  deadlineAt: number;
  cards: Readonly<Record<number, PlayedFootballer>>;
}

export type OnlineGame = OnlineSessionBase & GameView;
export type OnlineDuel = OnlineSessionBase & { game: 'duel'; view: DuelView };
export type OnlineDraft = OnlineSessionBase & { game: 'draft'; view: DraftView };
export type OnlineHigher = OnlineSessionBase & { game: 'higher'; view: HigherView };
export type OnlineChain = OnlineSessionBase & { game: 'chain'; view: ChainView };
export type OnlineRare = OnlineSessionBase & { game: 'rare'; view: RareView };
export type OnlineAuction = OnlineSessionBase & { game: 'auction'; view: AuctionView };
export type OnlineTopTen = OnlineSessionBase & { game: 'top-ten'; view: TopTenView };
export type OnlineCareer = OnlineSessionBase & { game: 'career'; view: CareerView };

export interface ReactionEvent {
  key: number;
  side: Side;
  reaction: ReactionId;
}

export interface RematchStatus {
  state: 'none' | 'open' | 'asking' | RematchState;
  endsAt: number | null;
}

const NO_REMATCH: RematchStatus = { state: 'none', endsAt: null };
const VISIBLE_REACTIONS = 4;
const TICK_MILLISECONDS = 250;
const BLOCKING_ERRORS: readonly PlayErrorCode[] = [
  'unauthorized',
  'outdated-client',
  'replaced',
  'no-grid',
  'room-not-found',
];

export function useOnlineMatch(entry: OnlineEntry, difficulty: Difficulty, game: GameId = 'grid') {
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
  const [live, setLive] = useState<OnlineGame | null>(null);
  const [opponentConnected, setOpponentConnected] = useState(true);
  const [reward, setReward] = useState<PointsChange | null>(null);
  const [rewardMatchId, setRewardMatchId] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [sentTurn, setSentTurn] = useState<number | null>(null);
  const [acting, setActing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [jokerUses, setJokerUses] = useState<JokerUse[]>([]);
  const [goals, setGoals] = useState<number | null>(null);
  const [jokerPending, setJokerPending] = useState<JokerId | null>(null);
  const [jokerError, setJokerError] = useState<PlayErrorCode | null>(null);
  const [rematch, setRematch] = useState<RematchStatus>(NO_REMATCH);
  const [reactions, setReactions] = useState<ReactionEvent[]>([]);
  const client = useRef<PlayClient | null>(null);
  const jokerWaiting = useRef(false);
  const reactionKey = useRef(0);
  const lastReactionAt = useRef(0);

  const pushReaction = (side: Side, reaction: ReactionId) => {
    reactionKey.current += 1;
    const key = reactionKey.current;
    setReactions((current) => [...current.slice(1 - VISIBLE_REACTIONS), { key, side, reaction }]);
  };

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
              ? {
                  id: found.id,
                  name: found.name,
                  countryCode: found.countryCode,
                  role: found.role,
                  hasPortrait: found.hasPortrait,
                }
              : unknownFootballer(footballerId),
          );
        }
      }
    };

    const cardsOf = async (state: GameView) => {
      const ids = gameCardIds(state);
      await remember(ids);
      return Object.fromEntries(ids.map((id) => [id, lookup(id)]));
    };

    const fail = (reason: OnlineFailure) => {
      setFailure(reason);
      setPhase('failed');
    };

    const beginMatch = () => {
      setJokerUses([]);
      setJokerPending(null);
      setJokerError(null);
      jokerWaiting.current = false;
      setReward(null);
      setRewardMatchId(null);
      setRematch(NO_REMATCH);
      setReactions([]);
    };

    const sendEntry = () => {
      if (!market || !connection) {
        return;
      }
      if (entryKind === 'join') {
        connection.send({ type: 'join-room', code: entryCode });
      } else {
        connection.send({
          type: entryKind === 'host' ? 'create-room' : entryKind === 'bot' ? 'play-bot' : 'queue',
          market: market.code,
          difficulty,
          game,
        });
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
          beginMatch();
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
        case 'joker':
          if (message.matchId !== matchId) {
            return;
          }
          setJokerUses((current) => [...current, { side: message.side, joker: message.joker, reveal: message.reveal }]);
          if (message.goals !== undefined) {
            setGoals(message.goals);
          }
          if (!message.replay && message.reveal !== null) {
            jokerWaiting.current = false;
            setJokerPending(null);
          }
          if (!message.replay && message.joker === 'extra-time' && game === 'grid') {
            const extra = (EXTRA_TIME_SECONDS.grid ?? 0) * 1000;
            setSession((current) => current && { ...current, turnEndsAt: current.turnEndsAt + extra });
          }
          return;
        case 'session': {
          const snapshot = message.session;
          if (!market) {
            fail('outdated-client');
            return;
          }
          const cards = await cardsOf(snapshot);
          if (disposed) {
            return;
          }
          matchId = snapshot.matchId;
          beginMatch();
          playing = snapshot.view.result === null;
          finished = snapshot.view.result !== null;
          setLive({
            ...snapshot,
            market,
            deadlineAt: receivedAt + snapshot.view.deadlineIn,
            cards,
          });
          setOpponentConnected(snapshot.opponentConnected);
          setActing(false);
          setNow(Date.now());
          setPhase('playing');
          return;
        }
        case 'view': {
          if (message.matchId !== matchId) {
            return;
          }
          const cards = await cardsOf(message);
          if (disposed) {
            return;
          }
          setLive((current) =>
            current && current.game === message.game
              ? ({
                  ...current,
                  game: message.game,
                  view: message.view,
                  deadlineAt: receivedAt + message.view.deadlineIn,
                  cards: { ...current.cards, ...cards },
                } as OnlineGame)
              : current,
          );
          setNow(Date.now());
          setActing(false);
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
            setReward(message.points ?? null);
            setRewardMatchId(message.matchId);
            setRematch(message.rematch ? { state: 'open', endsAt: receivedAt + REMATCH_WINDOW_MILLISECONDS } : NO_REMATCH);
            setSession((current) => current && finishSession(current, message.result));
            setLive((current) => current && ({ ...current, ...finishGameView(current, message.result) } as OnlineGame));
          }
          return;
        case 'opponent':
          if (message.matchId === matchId) {
            setOpponentConnected(message.connected);
          }
          return;
        case 'rematch':
          if (message.matchId === matchId) {
            setRematch({ state: message.state, endsAt: message.endsIn > 0 ? receivedAt + message.endsIn : null });
          }
          return;
        case 'reaction':
          if (message.matchId === matchId) {
            pushReaction(message.side, message.reaction);
          }
          return;
        case 'error':
          if (jokerWaiting.current) {
            jokerWaiting.current = false;
            setJokerPending(null);
            setJokerError(message.code);
          }
          if (BLOCKING_ERRORS.includes(message.code)) {
            fail(message.code);
          } else {
            setSentTurn(null);
            setActing(false);
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
        dataVersion: activeDataVersion(),
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
  }, [token, database, language, entryKind, entryCode, difficulty, game, round]);

  const unavailable: OnlineFailure | null = !token ? 'signed-out' : !apiUrl ? 'offline' : null;
  const gridActive = session !== null && session.match.result === null;
  const liveActive = live !== null && live.view.result === null;
  const active = phase === 'playing' && (gridActive || liveActive);

  useEffect(() => {
    if (!active) {
      return;
    }
    const interval = setInterval(() => setNow(Date.now()), TICK_MILLISECONDS);
    return () => clearInterval(interval);
  }, [active]);

  const ownTurn = active && setup !== null && session !== null && session.match.turn === setup.side;
  const canPlay = ownTurn && !reconnecting && sentTurn !== session.match.turnNumber;
  const canAct = active && liveActive && !reconnecting && !acting;

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

  const act = (action: GameAction) => {
    if (!canAct || !live) {
      return;
    }
    if (client.current?.send({ type: 'act', matchId: live.matchId, action })) {
      setActing(true);
    }
  };

  const useJoker = (joker: JokerId, target: JokerTarget = {}) => {
    const matchId = live?.matchId ?? setup?.matchId ?? null;
    if (!matchId || jokerWaiting.current) {
      return;
    }
    setJokerError(null);
    if (client.current?.send({ type: 'joker', matchId, joker, target })) {
      jokerWaiting.current = true;
      setJokerPending(joker);
    }
  };

  const sendReaction = (reaction: ReactionId): boolean => {
    const matchId = live?.matchId ?? setup?.matchId ?? null;
    const side = live?.side ?? setup?.side ?? null;
    const time = Date.now();
    if (!matchId || !side || time - lastReactionAt.current < REACTION_COOLDOWN_MILLISECONDS) {
      return false;
    }
    if (!client.current?.send({ type: 'react', matchId, reaction })) {
      return false;
    }
    lastReactionAt.current = time;
    pushReaction(side, reaction);
    return true;
  };

  const askRematch = () => {
    const matchId = live?.matchId ?? setup?.matchId ?? null;
    if (!matchId || (rematch.state !== 'open' && rematch.state !== 'offered')) {
      return;
    }
    if (client.current?.send({ type: 'rematch', matchId })) {
      setRematch((current) => ({ ...current, state: 'asking' }));
    }
  };

  const playAgain = () => {
    setJokerUses([]);
    setJokerPending(null);
    setJokerError(null);
    jokerWaiting.current = false;
    setSession(null);
    setSetup(null);
    setLive(null);
    setRoomCode(null);
    setFailure(null);
    setSentTurn(null);
    setActing(false);
    setReconnecting(false);
    setOpponentConnected(true);
    setReward(null);
    setRewardMatchId(null);
    setRematch(NO_REMATCH);
    setReactions([]);
    setPhase('connecting');
    setRound((current) => current + 1);
  };

  return {
    phase: unavailable ? ('failed' as const) : phase,
    failure: unavailable ?? failure,
    roomCode,
    setup,
    session,
    live,
    opponentConnected,
    reconnecting,
    reward,
    rewardMatchId,
    jokers: { uses: jokerUses, goals, pending: jokerPending, error: jokerError, use: useJoker },
    rematch,
    askRematch,
    reactions,
    sendReaction,
    secondsLeft: session ? secondsLeft(session, now) : 0,
    liveSecondsLeft: live ? Math.max(0, Math.ceil((live.deadlineAt - now) / 1000)) : 0,
    canPlay,
    canAct,
    answer,
    act,
    playAgain,
  };
}
