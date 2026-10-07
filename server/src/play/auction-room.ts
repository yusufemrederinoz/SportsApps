import {
  AUCTION_MAX_BID,
  AuctionError,
  auctionCriteria,
  auctionWinner,
  challenge,
  createAuction,
  failProof,
  nameAnswer,
  nextAuctionRound,
  placeBid,
  type AuctionState,
  type BotLevel,
  type Grid,
  type Header,
  type Side,
} from '@sportapps/game-core';
import {
  AUCTION_BID_SECONDS,
  AUCTION_PROOF_BASE_SECONDS,
  AUCTION_PROOF_SECONDS_PER_ANSWER,
  type AuctionView,
  type AuctionViewPhase,
  type PlayErrorCode,
  type PlayResult,
} from '@sportapps/protocol';

import type { FootballLibrary } from '../football/library';
import { botLevelFor } from './bot';
import { NO_JOKER, SIDES, seatSide, type LiveRoom, type RoomFactory, type WaitRange } from './live-room';
import { TURN_GRACE_MILLISECONDS } from './room';

const SECOND = 1000;
const ROUNDS = 3;
const CELL_FAME = 32;
const MINIMUM_ANSWERS = 6;
const GRID_ATTEMPTS = 6;
const BOT_LIST = 30;
const BOT_FAME: Record<BotLevel, number> = { 1: 55, 2: 45, 3: 35 };
const BOT_SHARE: Record<BotLevel, number> = { 1: 0.35, 2: 0.55, 3: 0.75 };
const BOT_OVERBID: Record<BotLevel, number> = { 1: 0.4, 2: 0.2, 3: 0.05 };

export interface AuctionTiming {
  bidMilliseconds: number;
  proofBaseMilliseconds: number;
  proofPerAnswerMilliseconds: number;
  revealMilliseconds: number;
  botBidMilliseconds: WaitRange;
  botNameMilliseconds: WaitRange;
}

export const DEFAULT_AUCTION_TIMING: AuctionTiming = {
  bidMilliseconds: AUCTION_BID_SECONDS * SECOND,
  proofBaseMilliseconds: AUCTION_PROOF_BASE_SECONDS * SECOND,
  proofPerAnswerMilliseconds: AUCTION_PROOF_SECONDS_PER_ANSWER * SECOND,
  revealMilliseconds: 4000,
  botBidMilliseconds: { minimum: 2000, maximum: 5000 },
  botNameMilliseconds: { minimum: 3000, maximum: 6000 },
};

export type AuctionLibrary = Pick<FootballLibrary, 'pickGrid' | 'isCorrect' | 'answerCount' | 'answersFor'>;

type Timer = ReturnType<typeof setTimeout>;

interface Criteria {
  row: Header;
  column: Header;
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.min(index, Math.floor(random() * (index + 1)));
    [shuffled[index], shuffled[other]] = [shuffled[other] as T, shuffled[index] as T];
  }
  return shuffled;
}

function within(range: WaitRange, random: () => number): number {
  return range.minimum + random() * Math.max(0, range.maximum - range.minimum);
}

export function richCells(library: AuctionLibrary, market: string, grid: Grid): Criteria[] {
  return [0, 1, 2]
    .flatMap((row) => [0, 1, 2].map((column) => ({ row: grid.rows[row] as Header, column: grid.columns[column] as Header })))
    .filter((cell) => library.answerCount(market, cell.row, cell.column, CELL_FAME) >= MINIMUM_ANSWERS);
}

export function botTarget(known: number, level: BotLevel, random: () => number): number {
  const reach = Math.max(1, Math.floor(known * BOT_SHARE[level]));
  return Math.min(AUCTION_MAX_BID, reach + (random() < BOT_OVERBID[level] ? 1 : 0));
}

export function createAuctionRoomFactory(library: AuctionLibrary, timing: AuctionTiming = DEFAULT_AUCTION_TIMING): RoomFactory {
  return (context) => {
    const { id, kind, market, difficulty, seats, now, random } = context;
    let cells: Criteria[] = [];
    for (let attempt = 0; attempt < GRID_ATTEMPTS && cells.length < ROUNDS; attempt += 1) {
      const grid = library.pickGrid(market, difficulty, random);
      cells = grid ? richCells(library, market, grid) : [];
    }
    if (cells.length < ROUNDS) {
      return null;
    }

    const startedAt = now();
    const botLevel = botLevelFor(difficulty, context.rivalOutcomes);
    let state: AuctionState<Criteria> = createAuction(shuffle(cells, random).slice(0, ROUNDS), random() < 0.5 ? 'x' : 'o');
    let stage: AuctionViewPhase = 'bidding';
    let phaseMilliseconds = timing.bidMilliseconds;
    let deadline = startedAt + phaseMilliseconds;
    let result: PlayResult | null = null;
    let finishedAt: number | null = null;
    let phaseTimer: Timer | null = null;
    let botTimer: Timer | null = null;
    let botKnowledge: { round: number; names: number[]; target: number } | null = null;

    const isBot = (side: Side) => seats[side].userId === null;

    const knowledge = () => {
      const criteria = auctionCriteria(state);
      if (!botKnowledge || botKnowledge.round !== state.round) {
        const names = criteria ? library.answersFor(market, criteria.row, criteria.column, BOT_FAME[botLevel], BOT_LIST) : [];
        const reach = Math.max(1, Math.floor(names.length * BOT_SHARE[botLevel]));
        botKnowledge = { round: state.round, names: names.slice(0, reach), target: botTarget(names.length, botLevel, random) };
      }
      return botKnowledge;
    };

    const view = (): AuctionView => {
      const criteria = auctionCriteria(state);
      const outcome = stage === 'reveal' || stage === 'finished' ? (state.outcomes.at(-1) ?? null) : null;
      return {
        phase: stage,
        round: state.round,
        roundsToWin: state.roundsToWin,
        maxBid: AUCTION_MAX_BID,
        criteria: criteria
          ? {
              row: { kind: criteria.row.kind, referenceId: criteria.row.referenceId },
              column: { kind: criteria.column.kind, referenceId: criteria.column.referenceId },
            }
          : null,
        turn: state.turn,
        bid: state.bid,
        bidder: state.bidder,
        named: [...state.named],
        missed: [...state.missed],
        outcome: outcome ? { prover: outcome.prover, bid: outcome.bid, named: outcome.named, winner: outcome.winner } : null,
        phaseSeconds: Math.round(phaseMilliseconds / SECOND),
        deadlineIn: stage === 'finished' ? 0 : Math.max(0, deadline - now()),
        scores: { ...state.scores },
        result,
      };
    };

    const broadcast = () => {
      const current = view();
      SIDES.forEach((side) => context.send(side, { type: 'view', matchId: id, game: 'auction', view: current }));
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

    const startPhase = (milliseconds: number, onExpire: () => void) => {
      stopTimers();
      phaseMilliseconds = milliseconds;
      deadline = now() + milliseconds;
      phaseTimer = setTimeout(onExpire, milliseconds + TURN_GRACE_MILLISECONDS);
    };

    function afterSettle(): void {
      stopTimers();
      stage = 'reveal';
      phaseMilliseconds = timing.revealMilliseconds;
      deadline = now() + timing.revealMilliseconds;
      phaseTimer = setTimeout(() => {
        if (state.phase === 'finished') {
          finish({ winner: auctionWinner(state), reason: 'score' });
        } else {
          state = nextAuctionRound(state);
          startBidding();
        }
      }, timing.revealMilliseconds);
      broadcast();
    }

    function botName(side: Side): void {
      botTimer = null;
      if (stage !== 'proving' || state.bidder !== side) {
        return;
      }
      const next = knowledge().names.find((name) => !state.named.includes(name) && !state.missed.includes(name));
      if (next === undefined) {
        state = failProof(state);
        afterSettle();
        return;
      }
      name(side, next);
      if (stage === 'proving') {
        botTimer = setTimeout(() => botName(side), within(timing.botNameMilliseconds, random));
      }
    }

    function startProof(): void {
      stage = 'proving';
      const prover = state.bidder as Side;
      startPhase(timing.proofBaseMilliseconds + timing.proofPerAnswerMilliseconds * state.bid, () => {
        if (stage === 'proving') {
          state = failProof(state);
          afterSettle();
        }
      });
      broadcast();
      if (isBot(prover)) {
        botTimer = setTimeout(() => botName(prover), within(timing.botNameMilliseconds, random));
      }
    }

    function botBid(side: Side): void {
      botTimer = null;
      if (stage !== 'bidding' || state.turn !== side) {
        return;
      }
      const { target } = knowledge();
      if (state.bid < target) {
        bid(side, Math.min(target, state.bid + (random() < 0.3 ? 2 : 1)));
      } else if (state.bidder !== null) {
        challengeBid(side);
      } else {
        bid(side, 1);
      }
    }

    function startBidding(): void {
      stage = 'bidding';
      const side = state.turn;
      startPhase(timing.bidMilliseconds, () => {
        if (stage !== 'bidding' || state.turn !== side) {
          return;
        }
        if (state.bidder === null) {
          bid(side, 1);
        } else {
          challengeBid(side);
        }
      });
      broadcast();
      if (isBot(side)) {
        botTimer = setTimeout(() => botBid(side), within(timing.botBidMilliseconds, random));
      }
    }

    function afterBid(): void {
      if (state.phase === 'proving') {
        startProof();
      } else {
        startBidding();
      }
    }

    function bid(side: Side, amount: number): PlayErrorCode | null {
      try {
        state = placeBid(state, side, amount);
      } catch (error) {
        if (error instanceof AuctionError) {
          return error.code === 'not-your-turn' ? 'not-your-turn' : 'invalid-action';
        }
        throw error;
      }
      afterBid();
      return null;
    }

    function challengeBid(side: Side): PlayErrorCode | null {
      try {
        state = challenge(state, side);
      } catch (error) {
        if (error instanceof AuctionError) {
          return error.code === 'not-your-turn' ? 'not-your-turn' : 'invalid-action';
        }
        throw error;
      }
      startProof();
      return null;
    }

    function name(side: Side, footballerId: number): PlayErrorCode | null {
      const criteria = auctionCriteria(state);
      if (stage !== 'proving' || !criteria) {
        return 'invalid-action';
      }
      try {
        state = nameAnswer(state, side, footballerId, library.isCorrect(footballerId, criteria.row, criteria.column));
      } catch (error) {
        if (error instanceof AuctionError) {
          return error.code === 'not-your-turn' ? 'not-your-turn' : 'invalid-action';
        }
        throw error;
      }
      if (state.phase === 'between' || state.phase === 'finished') {
        afterSettle();
      } else {
        broadcast();
      }
      return null;
    }

    const live: LiveRoom = {
      id,
      kind,
      game: 'auction',
      seats,
      sideOf: (userId) => seatSide(seats, userId),
      start: startBidding,
      greeting: (side, opponentConnected) => ({
        type: 'session',
        session: {
          matchId: id,
          game: 'auction',
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
        const { action } = message;
        switch (action.kind) {
          case 'bid':
            return stage === 'bidding' ? bid(side, action.amount) : 'invalid-action';
          case 'challenge':
            return stage === 'bidding' ? challengeBid(side) : 'invalid-action';
          case 'name':
            return name(side, action.footballerId);
          default:
            return 'invalid-action';
        }
      },
      forfeit(side) {
        if (stage !== 'finished') {
          finish({ winner: side === 'x' ? 'o' : 'x', reason: 'forfeit' });
        }
      },
      useJoker: NO_JOKER,
      finishedAt: () => finishedAt,
      record: () => ({
        game: 'auction',
        market,
        difficulty,
        gridId: 0,
        scores: state.scores,
        moveCount: state.outcomes.length,
        startedAt,
      }),
      dispose: stopTimers,
    };
    return live;
  };
}
