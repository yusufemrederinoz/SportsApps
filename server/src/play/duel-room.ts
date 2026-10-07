import { metricValue, type MetricRow } from '@sportapps/football-data';
import {
  DUEL_HAND_SIZE,
  DuelError,
  compareValues,
  createDuel,
  currentQuestion,
  duelWinner,
  handsReady,
  opponentOf,
  pendingSides,
  playCard,
  startPlay,
  submitHand,
  type BotLevel,
  type DuelQuestion,
  type Side,
} from '@sportapps/game-core';
import {
  DUEL_METRICS,
  DUEL_PICK_SECONDS,
  DUEL_PLAY_SECONDS,
  METRIC_PREFERENCES,
  type DuelConcept,
  type DuelMetric,
  type DuelView,
  type DuelViewPhase,
  type PlayErrorCode,
  type PlayResult,
} from '@sportapps/protocol';

import type { FootballLibrary } from '../football/library';
import { botLevelFor } from './bot';
import { SIDES, seatSide, type LiveRoom, type RoomFactory, type WaitRange } from './live-room';
import { TURN_GRACE_MILLISECONDS } from './room';

const SECOND = 1000;
const POOL_FAME = 45;
const POOL_SIZE = 60;
const AGE_METRICS: readonly DuelMetric[] = ['older', 'younger'];
const BOT_STRONG_PICKS: Record<BotLevel, number> = { 1: 1, 2: 4, 3: DUEL_HAND_SIZE };
const BOT_ACCURACY: Record<BotLevel, number> = { 1: 0.3, 2: 0.6, 3: 0.85 };

export interface DuelTiming {
  pickMilliseconds: number;
  playMilliseconds: number;
  revealMilliseconds: number;
  botPickMilliseconds: WaitRange;
  botFollowMilliseconds: WaitRange;
  botPlayMilliseconds: WaitRange;
}

export const DEFAULT_DUEL_TIMING: DuelTiming = {
  pickMilliseconds: DUEL_PICK_SECONDS * SECOND,
  playMilliseconds: DUEL_PLAY_SECONDS * SECOND,
  revealMilliseconds: 4500,
  botPickMilliseconds: { minimum: 9000, maximum: 26000 },
  botFollowMilliseconds: { minimum: 1500, maximum: 4000 },
  botPlayMilliseconds: { minimum: 2000, maximum: 7000 },
};

export type DuelLibrary = Pick<FootballLibrary, 'duelConcepts' | 'conceptPlayers' | 'conceptMembers' | 'metricRows'>;

type Timer = ReturnType<typeof setTimeout>;

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

function within(range: WaitRange, random: () => number): number {
  return range.minimum + random() * Math.max(0, range.maximum - range.minimum);
}

export function pickConcept(concepts: readonly DuelConcept[], random: () => number): DuelConcept {
  const kind = pick(Array.from(new Set(concepts.map((concept) => concept.kind))), random);
  return pick(
    concepts.filter((concept) => concept.kind === kind),
    random,
  );
}

export function chooseQuestions(
  cards: readonly number[],
  valueOf: (footballerId: number, metric: DuelMetric) => number | null,
  random: () => number,
): DuelQuestion<DuelMetric>[] {
  const coverage = (metric: DuelMetric) => cards.filter((id) => valueOf(id, metric) !== null).length;
  const covered = DUEL_METRICS.filter((metric) => coverage(metric) === cards.length);
  const stats = shuffle(covered.filter((metric) => !AGE_METRICS.includes(metric)), random);
  const ages = shuffle(covered.filter((metric) => AGE_METRICS.includes(metric)), random);
  const partial = DUEL_METRICS.filter((metric) => !covered.includes(metric)).sort(
    (first, second) => coverage(second) - coverage(first),
  );
  const preferred = [...stats.slice(0, DUEL_HAND_SIZE - 1), ...ages, ...stats.slice(DUEL_HAND_SIZE - 1), ...partial];
  const order = shuffle(preferred.slice(0, DUEL_HAND_SIZE), random);
  return Array.from({ length: DUEL_HAND_SIZE }, (_, index) => {
    const metric = order[index % order.length] as DuelMetric;
    return { metric, prefer: METRIC_PREFERENCES[metric] };
  });
}

export function createDuelRoomFactory(library: DuelLibrary, timing: DuelTiming = DEFAULT_DUEL_TIMING): RoomFactory {
  return (context) => {
    const { id, kind, market, difficulty, seats, now, random } = context;
    const concepts = library.duelConcepts(market);
    if (concepts.length === 0) {
      return null;
    }
    const concept = pickConcept(concepts, random);
    const pool = library.conceptPlayers(concept, market, POOL_FAME, POOL_SIZE);
    if (pool.length < DUEL_HAND_SIZE) {
      return null;
    }

    const startedAt = now();
    const rows = new Map<number, MetricRow>();
    const botTimers = new Map<Side, Timer>();
    const botLevel = botLevelFor(difficulty, context.rivalOutcomes);
    const botSides = SIDES.filter((side) => seats[side].userId === null);
    let state = createDuel<DuelMetric>();
    let stage: DuelViewPhase = 'picking';
    let deadline = startedAt + timing.pickMilliseconds;
    let result: PlayResult | null = null;
    let finishedAt: number | null = null;
    let phaseTimer: Timer | null = null;

    const remember = (footballerIds: readonly number[]) => {
      const missing = footballerIds.filter((footballerId) => !rows.has(footballerId));
      library.metricRows(missing).forEach((row) => rows.set(row.id, row));
    };

    const valueOf = (footballerId: number, metric: DuelMetric): number | null => {
      const row = rows.get(footballerId);
      return row ? metricValue(row, metric) : null;
    };

    const strongest = (cards: readonly number[], question: DuelQuestion<DuelMetric>): number =>
      cards.reduce((best, card) =>
        compareValues(valueOf(card, question.metric), valueOf(best, question.metric), question.prefer) < 0 ? card : best,
      );

    const complete = (chosen: readonly number[]): number[] => {
      const spare = shuffle(
        pool.filter((footballerId) => !chosen.includes(footballerId)),
        random,
      );
      return [...chosen, ...spare].slice(0, DUEL_HAND_SIZE);
    };

    const view = (side: Side): DuelView => {
      const other = opponentOf(side);
      const hand = state.hands[side];
      return {
        phase: stage,
        concept,
        handSize: DUEL_HAND_SIZE,
        totalRounds: DUEL_HAND_SIZE,
        deadlineIn: stage === 'finished' ? 0 : Math.max(0, deadline - now()),
        hand: hand ? [...hand] : null,
        opponentReady: state.hands[other] !== null,
        remaining: [...state.remaining[side]],
        opponentRemaining: state.remaining[other].length,
        question: stage === 'playing' ? currentQuestion(state) : null,
        played: state.plays[side] ?? null,
        opponentPlayed: state.plays[other] !== undefined,
        rounds: state.rounds.map((round) => ({
          metric: round.question.metric,
          prefer: round.question.prefer,
          cards: round.cards,
          values: round.values,
          winner: round.winner,
        })),
        scores: state.scores,
        result,
      };
    };

    const broadcast = () =>
      SIDES.forEach((side) => context.send(side, { type: 'view', matchId: id, game: 'duel', view: view(side) }));

    const stopBots = () => {
      botTimers.forEach((timer) => clearTimeout(timer));
      botTimers.clear();
    };

    const stopTimers = () => {
      stopBots();
      if (phaseTimer) {
        clearTimeout(phaseTimer);
        phaseTimer = null;
      }
    };

    const schedule = (action: () => void, delay: number) => {
      if (phaseTimer) {
        clearTimeout(phaseTimer);
      }
      phaseTimer = setTimeout(action, delay);
    };

    const scheduleBot = (side: Side, action: () => void, delay: number) => {
      const pending = botTimers.get(side);
      if (pending) {
        clearTimeout(pending);
      }
      botTimers.set(
        side,
        setTimeout(() => {
          botTimers.delete(side);
          action();
        }, delay),
      );
    };

    const finish = (outcome: PlayResult) => {
      stopTimers();
      stage = 'finished';
      result = outcome;
      finishedAt = now();
      broadcast();
      context.onFinished(live, outcome);
    };

    const afterReveal = () => {
      if (state.phase === 'finished') {
        finish({ winner: duelWinner(state), reason: 'score' });
      } else {
        startRound();
      }
    };

    const reveal = () => {
      stopBots();
      stage = 'reveal';
      deadline = now() + timing.revealMilliseconds;
      schedule(afterReveal, timing.revealMilliseconds);
      broadcast();
    };

    const play = (side: Side, footballerId: number): PlayErrorCode | null => {
      if (stage !== 'playing') {
        return 'invalid-action';
      }
      const played = state.rounds.length;
      try {
        state = playCard(state, side, footballerId, valueOf);
      } catch (error) {
        if (error instanceof DuelError) {
          return 'invalid-action';
        }
        throw error;
      }
      if (state.rounds.length > played) {
        reveal();
      } else {
        broadcast();
      }
      return null;
    };

    const botPlay = (side: Side) => {
      const question = currentQuestion(state);
      const cards = state.remaining[side];
      if (stage !== 'playing' || !question || state.plays[side] !== undefined || cards.length === 0) {
        return;
      }
      play(side, random() < BOT_ACCURACY[botLevel] ? strongest(cards, question) : pick(cards, random));
    };

    const expireRound = () => {
      pendingSides(state).forEach((side) => {
        if (stage === 'playing' && state.plays[side] === undefined) {
          play(side, pick(state.remaining[side], random));
        }
      });
    };

    function startRound(): void {
      stage = 'playing';
      deadline = now() + timing.playMilliseconds;
      schedule(expireRound, timing.playMilliseconds + TURN_GRACE_MILLISECONDS);
      broadcast();
      botSides.forEach((side) => scheduleBot(side, () => botPlay(side), within(timing.botPlayMilliseconds, random)));
    }

    const beginPlay = () => {
      const cards = [...(state.hands.x ?? []), ...(state.hands.o ?? [])];
      remember(cards);
      state = startPlay(state, chooseQuestions(cards, valueOf, random));
      startRound();
    };

    const botHand = (): number[] => {
      remember(pool);
      const strong = DUEL_METRICS.reduce<number[]>((chosen, metric) => {
        const open = pool.filter((footballerId) => !chosen.includes(footballerId));
        return open.length > 0 ? [...chosen, strongest(open, { metric, prefer: METRIC_PREFERENCES[metric] })] : chosen;
      }, []);
      return complete(shuffle(strong, random).slice(0, BOT_STRONG_PICKS[botLevel]));
    };

    const lockHand = (side: Side, chosen: readonly number[]): PlayErrorCode | null => {
      if (stage !== 'picking' || state.hands[side] !== null) {
        return 'invalid-action';
      }
      if (
        chosen.length > DUEL_HAND_SIZE ||
        new Set(chosen).size !== chosen.length ||
        library.conceptMembers(concept, market, chosen).length !== chosen.length
      ) {
        return 'invalid-action';
      }
      state = submitHand(state, side, complete(chosen));
      if (handsReady(state)) {
        beginPlay();
        return null;
      }
      broadcast();
      botSides
        .filter((bot) => state.hands[bot] === null)
        .forEach((bot) => scheduleBot(bot, () => lockHand(bot, botHand()), within(timing.botFollowMilliseconds, random)));
      return null;
    };

    const expirePicking = () => {
      SIDES.forEach((side) => {
        if (stage === 'picking' && state.hands[side] === null) {
          lockHand(side, []);
        }
      });
    };

    const live: LiveRoom = {
      id,
      kind,
      game: 'duel',
      seats,
      sideOf: (userId) => seatSide(seats, userId),

      start() {
        schedule(expirePicking, timing.pickMilliseconds + TURN_GRACE_MILLISECONDS);
        botSides.forEach((side) =>
          scheduleBot(side, () => lockHand(side, botHand()), within(timing.botPickMilliseconds, random)),
        );
      },

      greeting: (side, opponentConnected) => ({
        type: 'session',
        session: {
          matchId: id,
          game: 'duel',
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
        const { action } = message;
        switch (action.kind) {
          case 'hand':
            return lockHand(side, action.footballerIds);
          case 'play':
            return play(side, action.footballerId);
          default:
            return 'invalid-action';
        }
      },

      forfeit(side) {
        if (stage !== 'finished') {
          finish({ winner: opponentOf(side), reason: 'forfeit' });
        }
      },

      finishedAt: () => finishedAt,

      record: () => ({
        game: 'duel',
        market,
        difficulty,
        gridId: 0,
        scores: state.scores,
        moveCount: state.rounds.length,
        startedAt,
      }),

      dispose: stopTimers,
    };
    return live;
  };
}
