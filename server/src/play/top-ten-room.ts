import type { RankedRow } from '@sportapps/football-data';
import {
  TopTenError,
  createTopTen,
  currentList,
  guessTopTen,
  nextTopTenRound,
  topTenWinner,
  type BotLevel,
  type Side,
  type TopTenRound,
  type TopTenState,
} from '@sportapps/game-core';
import {
  TOP_TEN_TURN_SECONDS,
  type PlayErrorCode,
  type PlayResult,
  type TopTenListView,
  type TopTenView,
  type TopTenViewPhase,
} from '@sportapps/protocol';

import type { FootballLibrary } from '../football/library';
import { NO_JOKER, SIDES, seatSide, type LiveRoom, type RoomFactory, type WaitRange } from './live-room';
import { TURN_GRACE_MILLISECONDS } from './room';

const SECOND = 1000;
const ROUNDS = 2;
const LIST_SIZE = 10;
const RANKING_DEPTH = 30;
const LIST_ATTEMPTS = 20;
const BOT_SHARE: Record<BotLevel, number> = { 1: 0.3, 2: 0.5, 3: 0.7 };

export interface TopTenTiming {
  turnMilliseconds: number;
  revealMilliseconds: number;
  botThinkMilliseconds: WaitRange;
}

export const DEFAULT_TOP_TEN_TIMING: TopTenTiming = {
  turnMilliseconds: TOP_TEN_TURN_SECONDS * SECOND,
  revealMilliseconds: 6000,
  botThinkMilliseconds: { minimum: 3000, maximum: 7000 },
};

export type TopTenLibrary = Pick<FootballLibrary, 'topTenLists' | 'ranking'>;

type Timer = ReturnType<typeof setTimeout>;

interface PreparedList {
  round: TopTenRound<TopTenListView>;
  nearMisses: number[];
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))] as T;
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.min(index, Math.floor(random() * (index + 1)));
    [shuffled[index], shuffled[other]] = [shuffled[other] as T, shuffled[index] as T];
  }
  return shuffled;
}

export function prepareLists(library: TopTenLibrary, market: string, random: () => number): PreparedList[] {
  const lists = shuffle(library.topTenLists(market), random);
  const prepared: PreparedList[] = [];
  for (const list of lists.slice(0, LIST_ATTEMPTS)) {
    const rows: RankedRow[] = library.ranking(list, RANKING_DEPTH);
    if (rows.length >= LIST_SIZE) {
      prepared.push({
        round: { list, entries: rows.slice(0, LIST_SIZE).map((row) => ({ footballerId: row.id, value: row.value })) },
        nearMisses: rows.slice(LIST_SIZE).map((row) => row.id),
      });
    }
    if (prepared.length === ROUNDS) {
      break;
    }
  }
  return prepared;
}

export function createTopTenRoomFactory(library: TopTenLibrary, timing: TopTenTiming = DEFAULT_TOP_TEN_TIMING): RoomFactory {
  return (context) => {
    const { id, kind, market, difficulty, seats, now, random } = context;
    const prepared = prepareLists(library, market, random);
    if (prepared.length < ROUNDS) {
      return null;
    }

    const startedAt = now();
    const { botLevel } = context;
    let state: TopTenState<TopTenListView> = createTopTen(
      prepared.map((entry) => entry.round),
      random() < 0.5 ? 'x' : 'o',
    );
    let stage: TopTenViewPhase = 'playing';
    let deadline = startedAt + timing.turnMilliseconds;
    let result: PlayResult | null = null;
    let finishedAt: number | null = null;
    let phaseTimer: Timer | null = null;
    let botTimer: Timer | null = null;
    let botKnowledge: { round: number; names: number[] } | null = null;

    const knowledge = () => {
      if (!botKnowledge || botKnowledge.round !== state.round) {
        const entries = currentList(state)?.entries ?? [];
        const count = Math.max(1, Math.round(entries.length * BOT_SHARE[botLevel]));
        botKnowledge = { round: state.round, names: shuffle(entries, random).slice(0, count).map((entry) => entry.footballerId) };
      }
      return botKnowledge;
    };

    const view = (): TopTenView => {
      const list = currentList(state);
      const showAll = stage !== 'playing';
      const last = state.guesses.at(-1);
      return {
        phase: stage,
        round: state.round + 1,
        totalRounds: state.rounds.length,
        list: (list as TopTenRound<TopTenListView>).list,
        entries: (list?.entries ?? []).map((entry, index) => {
          const foundBy = state.found[index] ?? null;
          const visible = showAll || foundBy !== null;
          return {
            rank: index + 1,
            footballerId: visible ? entry.footballerId : null,
            value: visible ? entry.value : null,
            foundBy,
          };
        }),
        turn: state.turn,
        lives: { ...state.lives },
        maxLives: state.maxLives,
        lastGuess: last && last.round === state.round ? { side: last.side, footballerId: last.footballerId, rank: last.rank } : null,
        deadlineIn: stage === 'finished' ? 0 : Math.max(0, deadline - now()),
        scores: { ...state.scores },
        result,
      };
    };

    const broadcast = () => {
      const current = view();
      SIDES.forEach((side) => context.send(side, { type: 'view', matchId: id, game: 'top-ten', view: current }));
    };

    const stopTimers = () => {
      [phaseTimer, botTimer].forEach((timer) => timer && clearTimeout(timer));
      phaseTimer = null;
      botTimer = null;
    };

    const finish = (outcome: PlayResult) => {
      stopTimers();
      stage = 'finished';
      result = outcome;
      finishedAt = now();
      broadcast();
      context.onFinished(live, outcome);
    };

    const reveal = () => {
      stopTimers();
      stage = 'reveal';
      deadline = now() + timing.revealMilliseconds;
      phaseTimer = setTimeout(() => {
        if (state.phase === 'finished') {
          finish({ winner: topTenWinner(state), reason: 'score' });
        } else {
          state = nextTopTenRound(state);
          startTurn();
        }
      }, timing.revealMilliseconds);
      broadcast();
    };

    const guess = (side: Side, footballerId: number | null): PlayErrorCode | null => {
      if (stage !== 'playing') {
        return 'invalid-action';
      }
      try {
        state = guessTopTen(state, side, footballerId);
      } catch (error) {
        if (error instanceof TopTenError) {
          return error.code === 'not-your-turn' ? 'not-your-turn' : 'invalid-action';
        }
        throw error;
      }
      if (state.phase === 'playing') {
        startTurn();
      } else {
        reveal();
      }
      return null;
    };

    const botGuess = (side: Side) => {
      botTimer = null;
      if (stage !== 'playing' || state.turn !== side) {
        return;
      }
      const entries = currentList(state)?.entries ?? [];
      const open = knowledge().names.filter((name) => {
        const index = entries.findIndex((entry) => entry.footballerId === name);
        return index >= 0 && state.found[index] === null;
      });
      const misses = prepared[state.round]?.nearMisses ?? [];
      guess(side, open.length > 0 ? pick(open, random) : misses.length > 0 ? pick(misses, random) : null);
    };

    function startTurn(): void {
      stopTimers();
      stage = 'playing';
      deadline = now() + timing.turnMilliseconds;
      const side = state.turn;
      phaseTimer = setTimeout(() => {
        if (stage === 'playing' && state.turn === side) {
          guess(side, null);
        }
      }, timing.turnMilliseconds + TURN_GRACE_MILLISECONDS);
      broadcast();
      if (seats[side].userId === null) {
        const think = timing.botThinkMilliseconds;
        botTimer = setTimeout(() => botGuess(side), think.minimum + random() * Math.max(0, think.maximum - think.minimum));
      }
    }

    const live: LiveRoom = {
      id,
      kind,
      game: 'top-ten',
      seats,
      sideOf: (userId) => seatSide(seats, userId),
      start: startTurn,
      greeting: (side, opponentConnected) => ({
        type: 'session',
        session: {
          matchId: id,
          game: 'top-ten',
          market,
          difficulty,
          side,
          usernames: { x: seats.x.username, o: seats.o.username },
          opponentConnected,
          view: view(),
        },
      }),
      handle(side, message) {
        if (message.type !== 'act') {
          return 'invalid-message';
        }
        return message.action.kind === 'name' ? guess(side, message.action.footballerId) : 'invalid-action';
      },
      forfeit(side) {
        if (stage !== 'finished') {
          finish({ winner: side === 'x' ? 'o' : 'x', reason: 'forfeit' });
        }
      },
      useJoker(side, joker) {
        if (stage !== 'playing' || state.phase !== 'playing') {
          return { error: 'invalid-action' };
        }
        if (joker === 'extra-life') {
          if (state.lives[side] <= 0) {
            return { error: 'invalid-action' };
          }
          const lives = state.lives[side] + 1;
          state = { ...state, lives: { ...state.lives, [side]: lives } };
          broadcast();
          return { reveal: { kind: 'life', lives } };
        }
        if (joker === 'first-letter') {
          const hidden = (currentList(state)?.entries ?? []).filter((_, index) => state.found[index] === null);
          return hidden.length > 0
            ? { reveal: { kind: 'initials', footballerId: pick(hidden, random).footballerId, birthYear: false } }
            : { error: 'invalid-action' };
        }
        return NO_JOKER();
      },
      finishedAt: () => finishedAt,
      record: () => ({
        game: 'top-ten',
        market,
        difficulty,
        gridId: 0,
        scores: state.scores,
        moveCount: state.guesses.length,
        startedAt,
      }),
      dispose: stopTimers,
    };
    return live;
  };
}
