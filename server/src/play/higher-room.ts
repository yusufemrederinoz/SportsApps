import { metricValue, type MetricRow } from '@sportapps/football-data';
import {
  HigherError,
  answerQuestion,
  betterCard,
  createHigher,
  higherWinner,
  type BotLevel,
  type HigherQuestion,
  type Side,
} from '@sportapps/game-core';
import {
  HIGHER_ANSWER_SECONDS,
  HIGHER_METRICS,
  METRIC_PREFERENCES,
  type HigherMetric,
  type HigherView,
  type HigherViewPhase,
  type PlayDifficulty,
  type PlayErrorCode,
  type PlayResult,
} from '@sportapps/protocol';

import type { FootballLibrary } from '../football/library';
import { botLevelFor } from './bot';
import { SIDES, seatSide, type LiveRoom, type RoomFactory, type WaitRange } from './live-room';
import { TURN_GRACE_MILLISECONDS } from './room';

const SECOND = 1000;
const POOL_SIZE = 400;
const QUESTION_ATTEMPTS = 60;
const POOL_FAME: Record<PlayDifficulty, number> = { 1: 55, 2: 45, 3: 35 };
const MINIMUM_RATIO: Record<PlayDifficulty, number> = { 1: 1.5, 2: 1.25, 3: 1.1 };
const MINIMUM_YEARS: Record<PlayDifficulty, number> = { 1: 5, 2: 3, 3: 1 };
const BOT_ACCURACY: Record<BotLevel, number> = { 1: 0.62, 2: 0.75, 3: 0.88 };

export interface HigherTiming {
  answerMilliseconds: number;
  revealMilliseconds: number;
  botAnswerMilliseconds: WaitRange;
}

export const DEFAULT_HIGHER_TIMING: HigherTiming = {
  answerMilliseconds: HIGHER_ANSWER_SECONDS * SECOND,
  revealMilliseconds: 2500,
  botAnswerMilliseconds: { minimum: 2000, maximum: 6000 },
};

export type HigherLibrary = Pick<FootballLibrary, 'comparablePlayers' | 'metricRows'>;

type Timer = ReturnType<typeof setTimeout>;

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))] as T;
}

export function separated(metric: HigherMetric, first: number, second: number, difficulty: PlayDifficulty): boolean {
  if (metric === 'older' || metric === 'younger') {
    return Math.abs(first - second) >= MINIMUM_YEARS[difficulty];
  }
  const low = Math.min(first, second);
  const high = Math.max(first, second);
  return high > 0 && (low === 0 || high / low >= MINIMUM_RATIO[difficulty]);
}

export function createQuestion(
  rows: readonly MetricRow[],
  used: ReadonlySet<number>,
  difficulty: PlayDifficulty,
  random: () => number,
): HigherQuestion<HigherMetric> | null {
  for (let attempt = 0; attempt < QUESTION_ATTEMPTS; attempt += 1) {
    const metric = pick(HIGHER_METRICS, random);
    const known = rows.filter((row) => !used.has(row.id) && metricValue(row, metric) !== null);
    if (known.length < 2) {
      continue;
    }
    const first = pick(known, random);
    const second = pick(
      known.filter((row) => row.id !== first.id),
      random,
    );
    const values = [metricValue(first, metric) as number, metricValue(second, metric) as number] as const;
    if (separated(metric, values[0], values[1], difficulty)) {
      return { metric, prefer: METRIC_PREFERENCES[metric], cards: [first.id, second.id], values };
    }
  }
  return null;
}

export function createHigherRoomFactory(library: HigherLibrary, timing: HigherTiming = DEFAULT_HIGHER_TIMING): RoomFactory {
  const pools = new Map<string, readonly MetricRow[]>();
  const poolFor = (market: string, difficulty: PlayDifficulty) => {
    const key = `${market}:${difficulty}`;
    const known = pools.get(key);
    if (known) {
      return known;
    }
    const loaded = library.metricRows(library.comparablePlayers(market, POOL_FAME[difficulty], POOL_SIZE));
    pools.set(key, loaded);
    return loaded;
  };

  return (context) => {
    const { id, kind, market, difficulty, seats, now, random } = context;
    const rows = poolFor(market, difficulty);
    const used = new Set<number>();
    const firstQuestion = createQuestion(rows, used, difficulty, random);
    if (!firstQuestion) {
      return null;
    }

    const startedAt = now();
    const botLevel = botLevelFor(difficulty, context.rivalOutcomes);
    let state = createHigher<HigherMetric>(random() < 0.5 ? 'x' : 'o');
    let question: HigherQuestion<HigherMetric> = firstQuestion;
    let stage: HigherViewPhase = 'answering';
    let deadline = startedAt;
    let result: PlayResult | null = null;
    let finishedAt: number | null = null;
    let phaseTimer: Timer | null = null;
    let botTimer: Timer | null = null;

    const remember = (current: HigherQuestion<HigherMetric>) => current.cards.forEach((card) => used.add(card));
    remember(question);

    const view = (): HigherView => {
      const last = state.answers.at(-1) ?? null;
      return {
        phase: stage,
        turn: state.turn,
        inning: Math.min(state.inning + 1, state.innings),
        totalInnings: state.innings,
        streak: state.streak,
        streakLimit: state.streakLimit,
        question:
          stage === 'answering'
            ? { metric: question.metric, prefer: question.prefer, cards: [question.cards[0], question.cards[1]] }
            : null,
        last: last
          ? {
              side: last.side,
              question: {
                metric: last.question.metric,
                prefer: last.question.prefer,
                cards: [last.question.cards[0], last.question.cards[1]],
              },
              values: [last.question.values[0], last.question.values[1]],
              choice: last.choice,
              correct: last.correct,
            }
          : null,
        deadlineIn: stage === 'finished' ? 0 : Math.max(0, deadline - now()),
        scores: { ...state.scores },
        result,
      };
    };

    const broadcast = () => {
      const current = view();
      SIDES.forEach((side) => context.send(side, { type: 'view', matchId: id, game: 'higher', view: current }));
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

    const answer = (side: Side, choice: number | null): PlayErrorCode | null => {
      if (stage !== 'answering') {
        return 'invalid-action';
      }
      try {
        state = answerQuestion(state, side, question, choice);
      } catch (error) {
        if (error instanceof HigherError) {
          return error.code === 'not-your-turn' ? 'not-your-turn' : 'invalid-action';
        }
        throw error;
      }
      stopTimers();
      stage = 'reveal';
      deadline = now() + timing.revealMilliseconds;
      phaseTimer = setTimeout(advance, timing.revealMilliseconds);
      broadcast();
      return null;
    };

    function ask(): void {
      stage = 'answering';
      deadline = now() + timing.answerMilliseconds;
      phaseTimer = setTimeout(() => answer(state.turn, null), timing.answerMilliseconds + TURN_GRACE_MILLISECONDS);
      broadcast();
      if (seats[state.turn].userId === null) {
        const side = state.turn;
        const wait = timing.botAnswerMilliseconds;
        botTimer = setTimeout(
          () => {
            const right = betterCard(question);
            const wrong = question.cards.find((card) => card !== right) ?? null;
            answer(side, random() < BOT_ACCURACY[botLevel] ? right : wrong);
          },
          wait.minimum + random() * Math.max(0, wait.maximum - wait.minimum),
        );
      }
    }

    function advance(): void {
      if (state.phase === 'finished') {
        finish({ winner: higherWinner(state), reason: 'score' });
        return;
      }
      const next = createQuestion(rows, used, difficulty, random);
      if (!next) {
        finish({ winner: higherWinner(state), reason: 'score' });
        return;
      }
      question = next;
      remember(question);
      ask();
    }

    const live: LiveRoom = {
      id,
      kind,
      game: 'higher',
      seats,
      sideOf: (userId) => seatSide(seats, userId),
      start: ask,
      greeting: (side, opponentConnected) => ({
        type: 'session',
        session: {
          matchId: id,
          game: 'higher',
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
        return message.action.kind === 'choose' ? answer(side, message.action.footballerId) : 'invalid-action';
      },
      forfeit(side) {
        if (stage !== 'finished') {
          finish({ winner: side === 'x' ? 'o' : 'x', reason: 'forfeit' });
        }
      },
      finishedAt: () => finishedAt,
      record: () => ({
        game: 'higher',
        market,
        difficulty,
        gridId: 0,
        scores: state.scores,
        moveCount: state.answers.length,
        startedAt,
      }),
      dispose: stopTimers,
    };
    return live;
  };
}
