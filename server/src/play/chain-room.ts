import {
  ChainError,
  addLink,
  chainTurnSeconds,
  chainWinner,
  createChain,
  isUsed,
  lastLink,
  missTurn,
  nextChainRound,
  type BotLevel,
  type ChainMissReason,
  type Side,
} from '@sportapps/game-core';
import type { ChainMissView, ChainView, ChainViewPhase, PlayErrorCode, PlayResult } from '@sportapps/protocol';

import type { FootballLibrary } from '../football/library';
import { botLevelFor } from './bot';
import { SIDES, seatSide, type LiveRoom, type RoomFactory, type WaitRange } from './live-room';
import { TURN_GRACE_MILLISECONDS } from './room';

const SECOND = 1000;
const MINIMUM_SEEDS = 5;
const BOT_CANDIDATES = 30;
const BOT_SHORTLIST = 10;
const BOT_FAME: Record<BotLevel, number> = { 1: 50, 2: 40, 3: 30 };
const BOT_FAILURE: Record<BotLevel, { base: number; growth: number }> = {
  1: { base: 0.2, growth: 0.03 },
  2: { base: 0.1, growth: 0.02 },
  3: { base: 0.04, growth: 0.015 },
};

export interface ChainTiming {
  revealMilliseconds: number;
  botThinkMilliseconds: WaitRange;
}

export const DEFAULT_CHAIN_TIMING: ChainTiming = {
  revealMilliseconds: 3000,
  botThinkMilliseconds: { minimum: 3000, maximum: 9000 },
};

export type ChainLibrary = Pick<FootballLibrary, 'chainSeeds' | 'sharedClub' | 'chainCandidates'>;

type Timer = ReturnType<typeof setTimeout>;

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))] as T;
}

export function botFailureChance(level: BotLevel, links: number): number {
  const { base, growth } = BOT_FAILURE[level];
  return Math.min(0.9, base + growth * links);
}

export function createChainRoomFactory(library: ChainLibrary, timing: ChainTiming = DEFAULT_CHAIN_TIMING): RoomFactory {
  return (context) => {
    const { id, kind, market, difficulty, seats, now, random } = context;
    const seeds = library.chainSeeds(market);
    if (seeds.length < MINIMUM_SEEDS) {
      return null;
    }

    const startedAt = now();
    const usedSeeds = new Set<number>();
    const botLevel = botLevelFor(difficulty, context.rivalOutcomes);
    const pickSeed = () => {
      const fresh = seeds.filter((seed) => !usedSeeds.has(seed));
      const seed = pick(fresh.length > 0 ? fresh : seeds, random);
      usedSeeds.add(seed);
      return seed;
    };

    let state = createChain(pickSeed(), random() < 0.5 ? 'x' : 'o');
    let stage: ChainViewPhase = 'playing';
    let deadline = startedAt;
    let lastMiss: ChainMissView | null = null;
    let result: PlayResult | null = null;
    let finishedAt: number | null = null;
    let phaseTimer: Timer | null = null;
    let botTimer: Timer | null = null;

    const view = (): ChainView => ({
      phase: stage,
      round: state.round,
      roundsToWin: state.roundsToWin,
      turn: state.turn,
      turnSeconds: chainTurnSeconds(state),
      chain: state.chain.map((link) => ({ ...link })),
      miss: stage === 'playing' ? null : lastMiss,
      deadlineIn: stage === 'finished' ? 0 : Math.max(0, deadline - now()),
      scores: { ...state.scores },
      result,
    });

    const broadcast = () => {
      const current = view();
      SIDES.forEach((side) => context.send(side, { type: 'view', matchId: id, game: 'chain', view: current }));
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

    const miss = (side: Side, footballerId: number | null, reason: ChainMissReason) => {
      state = missTurn(state, side, footballerId, reason);
      stopTimers();
      lastMiss = { side, footballerId, reason };
      stage = 'reveal';
      deadline = now() + timing.revealMilliseconds;
      phaseTimer = setTimeout(afterReveal, timing.revealMilliseconds);
      broadcast();
    };

    const link = (side: Side, footballerId: number): PlayErrorCode | null => {
      if (stage !== 'playing') {
        return 'invalid-action';
      }
      if (state.turn !== side) {
        return 'not-your-turn';
      }
      if (isUsed(state, footballerId)) {
        miss(side, footballerId, 'used');
        return null;
      }
      const club = library.sharedClub(market, lastLink(state).footballerId, footballerId);
      if (club === null) {
        miss(side, footballerId, 'wrong');
        return null;
      }
      try {
        state = addLink(state, side, footballerId, club);
      } catch (error) {
        if (error instanceof ChainError) {
          return 'invalid-action';
        }
        throw error;
      }
      startTurn();
      return null;
    };

    const botMove = (side: Side) => {
      botTimer = null;
      if (stage !== 'playing' || state.turn !== side) {
        return;
      }
      const links = state.chain.length - 1;
      const current = lastLink(state).footballerId;
      if (random() < botFailureChance(botLevel, links)) {
        const strangers = seeds.filter(
          (stranger) => stranger !== current && library.sharedClub(market, current, stranger) === null,
        );
        miss(side, strangers.length > 0 ? pick(strangers, random) : null, strangers.length > 0 ? 'wrong' : 'timeout');
        return;
      }
      const used = state.chain.map((entry) => entry.footballerId);
      const candidates = library.chainCandidates(market, current, used, BOT_FAME[botLevel], BOT_CANDIDATES);
      if (candidates.length > 0) {
        link(side, pick(candidates.slice(0, BOT_SHORTLIST), random));
      } else {
        miss(side, null, 'timeout');
      }
    };

    function startTurn(): void {
      stopTimers();
      stage = 'playing';
      const milliseconds = chainTurnSeconds(state) * SECOND;
      deadline = now() + milliseconds;
      const side = state.turn;
      phaseTimer = setTimeout(() => {
        if (stage === 'playing' && state.turn === side) {
          miss(side, null, 'timeout');
        }
      }, milliseconds + TURN_GRACE_MILLISECONDS);
      broadcast();
      if (seats[side].userId === null) {
        const think = timing.botThinkMilliseconds;
        const wait = Math.min(
          milliseconds - SECOND,
          think.minimum + random() * Math.max(0, think.maximum - think.minimum),
        );
        botTimer = setTimeout(() => botMove(side), Math.max(0, wait));
      }
    }

    function afterReveal(): void {
      if (state.phase === 'finished') {
        finish({ winner: chainWinner(state), reason: 'score' });
        return;
      }
      state = nextChainRound(state, pickSeed());
      startTurn();
    }

    const live: LiveRoom = {
      id,
      kind,
      game: 'chain',
      seats,
      sideOf: (userId) => seatSide(seats, userId),
      start: startTurn,
      greeting: (side, opponentConnected) => ({
        type: 'session',
        session: {
          matchId: id,
          game: 'chain',
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
        return message.action.kind === 'link' ? link(side, message.action.footballerId) : 'invalid-action';
      },
      forfeit(side) {
        if (stage !== 'finished') {
          finish({ winner: side === 'x' ? 'o' : 'x', reason: 'forfeit' });
        }
      },
      finishedAt: () => finishedAt,
      record: () => ({
        game: 'chain',
        market,
        difficulty,
        gridId: 0,
        scores: state.scores,
        moveCount: state.misses.length,
        startedAt,
      }),
      dispose: stopTimers,
    };
    return live;
  };
}
