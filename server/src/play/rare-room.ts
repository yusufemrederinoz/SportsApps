import {
  RARE_ROUNDS,
  RareError,
  createRare,
  currentCriteria,
  rareRoundReady,
  rareWinner,
  resolveRareRound,
  submitRareAnswer,
  type BotLevel,
  type CellPosition,
  type Grid,
  type Header,
  type RareAnswer,
  type Side,
} from '@sportapps/game-core';
import {
  RARE_ANSWER_SECONDS,
  type PlayErrorCode,
  type PlayResult,
  type RareCriteriaView,
  type RareView,
  type RareViewPhase,
} from '@sportapps/protocol';

import type { FootballLibrary } from '../football/library';
import { botLevelFor } from './bot';
import { SIDES, seatSide, type LiveRoom, type RoomFactory, type WaitRange } from './live-room';
import { TURN_GRACE_MILLISECONDS } from './room';

const SECOND = 1000;
const BOT_ANSWERS = 24;
const BOT_NEAR_MISSES = 8;
const BOT_FAME = 20;
const BOT_MISS: Record<BotLevel, number> = { 1: 0.3, 2: 0.15, 3: 0.07 };
const BOT_DEPTH: Record<BotLevel, number> = { 1: 0.85, 2: 0.5, 3: 0.15 };

export interface RareTiming {
  answerMilliseconds: number;
  revealMilliseconds: number;
  botAnswerMilliseconds: WaitRange;
}

export const DEFAULT_RARE_TIMING: RareTiming = {
  answerMilliseconds: RARE_ANSWER_SECONDS * SECOND,
  revealMilliseconds: 4500,
  botAnswerMilliseconds: { minimum: 6000, maximum: 20000 },
};

export type RareLibrary = Pick<FootballLibrary, 'pickGrid' | 'isCorrect' | 'fameOf' | 'rareAnswers' | 'nearMisses'>;

type Timer = ReturnType<typeof setTimeout>;

interface Criteria {
  row: Header;
  column: Header;
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

export function criteriaFrom(grid: Grid, count: number, random: () => number): Criteria[] {
  const cells: CellPosition[] = [0, 1, 2].flatMap((row) => [0, 1, 2].map((column) => ({ row, column })));
  return shuffle(cells, random)
    .slice(0, count)
    .map((cell) => ({ row: grid.rows[cell.row] as Header, column: grid.columns[cell.column] as Header }));
}

export function botRareAnswer(
  answers: readonly { id: number; fame: number }[],
  level: BotLevel,
  random: () => number,
): number | null {
  if (answers.length === 0 || random() < BOT_MISS[level]) {
    return null;
  }
  const index = Math.min(answers.length - 1, Math.floor(BOT_DEPTH[level] * (answers.length - 1) + random() * 2));
  return answers[index]?.id ?? null;
}

const toView = (criteria: Criteria): RareCriteriaView => ({
  row: { kind: criteria.row.kind, referenceId: criteria.row.referenceId },
  column: { kind: criteria.column.kind, referenceId: criteria.column.referenceId },
});

export function createRareRoomFactory(library: RareLibrary, timing: RareTiming = DEFAULT_RARE_TIMING): RoomFactory {
  return (context) => {
    const { id, kind, market, difficulty, seats, now, random } = context;
    const grid = library.pickGrid(market, difficulty, random);
    if (!grid) {
      return null;
    }

    const startedAt = now();
    const botLevel = botLevelFor(difficulty, context.rivalOutcomes);
    const botSides = SIDES.filter((side) => seats[side].userId === null);
    let state = createRare<Criteria>(criteriaFrom(grid, RARE_ROUNDS, random));
    let stage: RareViewPhase = 'answering';
    let deadline = startedAt + timing.answerMilliseconds;
    let result: PlayResult | null = null;
    let finishedAt: number | null = null;
    let phaseTimer: Timer | null = null;
    const botTimers: Timer[] = [];

    const view = (side: Side): RareView => {
      const criteria = currentCriteria(state);
      return {
        phase: stage,
        round: Math.min(state.rounds.length + (stage === 'answering' ? 1 : 0), state.criteria.length),
        totalRounds: state.criteria.length,
        criteria: stage === 'answering' && criteria ? toView(criteria) : null,
        answered: { x: state.pending.x !== undefined, o: state.pending.o !== undefined },
        own: state.pending[side]?.footballerId ?? null,
        rounds: state.rounds.map((round) => ({
          criteria: toView(round.criteria),
          answers: { x: { ...round.answers.x }, o: { ...round.answers.o } },
          winner: round.winner,
        })),
        deadlineIn: stage === 'finished' ? 0 : Math.max(0, deadline - now()),
        scores: { ...state.scores },
        result,
      };
    };

    const broadcast = () =>
      SIDES.forEach((side) => context.send(side, { type: 'view', matchId: id, game: 'rare', view: view(side) }));

    const stopTimers = () => {
      if (phaseTimer) {
        clearTimeout(phaseTimer);
        phaseTimer = null;
      }
      botTimers.splice(0).forEach((timer) => clearTimeout(timer));
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
      state = resolveRareRound(state);
      stage = 'reveal';
      deadline = now() + timing.revealMilliseconds;
      phaseTimer = setTimeout(afterReveal, timing.revealMilliseconds);
      broadcast();
    };

    const answer = (side: Side, footballerId: number | null): PlayErrorCode | null => {
      const criteria = currentCriteria(state);
      if (stage !== 'answering' || criteria === null) {
        return 'invalid-action';
      }
      const answered: RareAnswer =
        footballerId === null
          ? { footballerId: null, correct: false, fame: null }
          : {
              footballerId,
              correct: library.isCorrect(footballerId, criteria.row, criteria.column),
              fame: library.fameOf(market, footballerId),
            };
      try {
        state = submitRareAnswer(state, side, answered);
      } catch (error) {
        if (error instanceof RareError) {
          return 'invalid-action';
        }
        throw error;
      }
      if (rareRoundReady(state)) {
        reveal();
      } else {
        broadcast();
      }
      return null;
    };

    function ask(): void {
      stopTimers();
      stage = 'answering';
      deadline = now() + timing.answerMilliseconds;
      phaseTimer = setTimeout(reveal, timing.answerMilliseconds + TURN_GRACE_MILLISECONDS);
      broadcast();
      const criteria = currentCriteria(state);
      botSides.forEach((side) => {
        const wait = timing.botAnswerMilliseconds;
        botTimers.push(
          setTimeout(
            () => {
              if (!criteria || stage !== 'answering') {
                return;
              }
              const answers = library.rareAnswers(market, criteria.row, criteria.column, BOT_FAME, BOT_ANSWERS);
              const choice = botRareAnswer(answers, botLevel, random);
              const misses =
                choice === null ? library.nearMisses(market, criteria.row, criteria.column, BOT_FAME, BOT_NEAR_MISSES) : [];
              answer(side, choice ?? (misses.length > 0 ? pick(misses, random) : null));
            },
            wait.minimum + random() * Math.max(0, wait.maximum - wait.minimum),
          ),
        );
      });
    }

    function afterReveal(): void {
      if (state.phase === 'finished') {
        finish({ winner: rareWinner(state), reason: 'score' });
      } else {
        ask();
      }
    }

    const live: LiveRoom = {
      id,
      kind,
      game: 'rare',
      seats,
      sideOf: (userId) => seatSide(seats, userId),
      start: ask,
      greeting: (side, opponentConnected) => ({
        type: 'session',
        session: {
          matchId: id,
          game: 'rare',
          market,
          difficulty,
          side,
          usernames: { x: seats.x.username, o: seats.o.username },
          opponentConnected,
          view: view(side),
        },
      }),
      handle(side, message) {
        if (message.type !== 'act') {
          return 'invalid-message';
        }
        return message.action.kind === 'name' ? answer(side, message.action.footballerId) : 'invalid-action';
      },
      forfeit(side) {
        if (stage !== 'finished') {
          finish({ winner: side === 'x' ? 'o' : 'x', reason: 'forfeit' });
        }
      },
      finishedAt: () => finishedAt,
      record: () => ({
        game: 'rare',
        market,
        difficulty,
        gridId: grid.id,
        scores: state.scores,
        moveCount: state.rounds.length,
        startedAt,
      }),
      dispose: stopTimers,
    };
    return live;
  };
}
