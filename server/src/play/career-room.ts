import type { CareerDecoyFilter, CareerStepRow } from '@sportapps/football-data';
import {
  CareerError,
  attemptsLeft,
  careerPoints,
  careerWinner,
  createCareer,
  currentMystery,
  guessCareer,
  nextCareerRound,
  type BotLevel,
  type CareerState,
  type Side,
} from '@sportapps/game-core';
import {
  CAREER_TURN_SECONDS,
  type CareerFactsView,
  type CareerView,
  type CareerViewPhase,
  type PlayDifficulty,
  type PlayErrorCode,
  type PlayResult,
} from '@sportapps/protocol';

import type { FootballLibrary } from '../football/library';
import { NO_JOKER, SIDES, seatSide, type LiveRoom, type RoomFactory, type WaitRange } from './live-room';
import { TURN_GRACE_MILLISECONDS } from './room';
import { createThinkingClock, settleByScore } from './thinking';

const SECOND = 1000;
const ROUNDS = 3;
const MINIMUM_CLUBS = 3;
const MAXIMUM_CLUBS = 8;
const CANDIDATES = 300;
const DECOYS = 20;
const DECOY_FAME = 40;
const CHOICES = 4;
const CHOICE_POOL = 12;
const MYSTERY_FAME: Record<PlayDifficulty, number> = { 1: 65, 2: 55, 3: 45 };
const BOT_BASE: Record<BotLevel, number> = { 1: 0.12, 2: 0.22, 3: 0.32 };
const BOT_STEP = 0.15;
const BOT_CEILING = 0.95;

export interface CareerTiming {
  turnMilliseconds: number;
  revealMilliseconds: number;
  botThinkMilliseconds: WaitRange;
}

export const DEFAULT_CAREER_TIMING: CareerTiming = {
  turnMilliseconds: CAREER_TURN_SECONDS * SECOND,
  revealMilliseconds: 5000,
  botThinkMilliseconds: { minimum: 3000, maximum: 7000 },
};

export type CareerLibrary = Pick<
  FootballLibrary,
  'careerCandidates' | 'careerPath' | 'chainCandidates' | 'footballerFacts' | 'careerClubStats' | 'careerDecoys'
>;

type Timer = ReturnType<typeof setTimeout>;

interface Mystery {
  footballerId: number;
  path: CareerStepRow[];
}

interface MysteryHelp {
  facts: CareerFactsView;
  stats: ReadonlyMap<number, { appearances: number | null; goals: number | null }>;
  choices: number[];
}

export function chooseChoices(
  library: CareerLibrary,
  market: string,
  mystery: Mystery,
  facts: CareerFactsView,
  random: () => number,
): number[] {
  const firstClub = mystery.path[0]?.clubId ?? null;
  const filters: CareerDecoyFilter[] = [
    { countryId: facts.countryId, position: facts.position, clubId: firstClub },
    { countryId: facts.countryId, position: facts.position },
    { countryId: facts.countryId },
    { position: facts.position, clubId: firstClub },
    {},
  ];
  const decoys: number[] = [];
  for (const filter of filters) {
    if (decoys.length >= CHOICES - 1) {
      break;
    }
    const found = library.careerDecoys(market, DECOY_FAME, filter, [mystery.footballerId, ...decoys], CHOICE_POOL);
    decoys.push(...shuffle(found, random).slice(0, CHOICES - 1 - decoys.length));
  }
  return shuffle([mystery.footballerId, ...decoys], random);
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

export function botKnows(level: BotLevel, revealed: number): number {
  return Math.min(BOT_CEILING, BOT_BASE[level] + BOT_STEP * (revealed - 1));
}

export function chooseMysteries(
  library: CareerLibrary,
  market: string,
  difficulty: PlayDifficulty,
  random: () => number,
): Mystery[] {
  const candidates = shuffle(library.careerCandidates(market, MYSTERY_FAME[difficulty], MINIMUM_CLUBS, CANDIDATES), random);
  const chosen: Mystery[] = [];
  for (const footballerId of candidates) {
    const path = library.careerPath(footballerId);
    if (path.length >= MINIMUM_CLUBS && path.length <= MAXIMUM_CLUBS) {
      chosen.push({ footballerId, path });
    }
    if (chosen.length === ROUNDS) {
      break;
    }
  }
  return chosen;
}

export function createCareerRoomFactory(library: CareerLibrary, timing: CareerTiming = DEFAULT_CAREER_TIMING): RoomFactory {
  return (context) => {
    const { id, kind, market, difficulty, seats, now, random } = context;
    const mysteries = chooseMysteries(library, market, difficulty, random);
    if (mysteries.length < ROUNDS) {
      return null;
    }
    const features = context.features ?? [];
    const helps = features.includes('career-help');
    const offersChoices = difficulty === 1 && features.includes('career-choices');
    const showsFacts = helps && difficulty <= 2;
    const help: MysteryHelp[] = mysteries.map((mystery) => {
      const known = library.footballerFacts(mystery.footballerId);
      const facts = { countryId: known?.countryId ?? null, position: known?.position ?? null };
      return {
        facts,
        stats: new Map(
          helps
            ? library
                .careerClubStats(mystery.footballerId)
                .map((row) => [row.clubId, { appearances: row.appearances, goals: row.goals }] as const)
            : [],
        ),
        choices: offersChoices ? chooseChoices(library, market, mystery, facts, random) : [],
      };
    });

    const startedAt = now();
    const { botLevel } = context;
    const first: Side = random() < 0.5 ? 'x' : 'o';
    const clock = createThinkingClock(now);
    let state: CareerState = createCareer(
      mysteries.map((mystery) => ({ footballerId: mystery.footballerId, clues: mystery.path.length })),
      first,
    );
    let stage: CareerViewPhase = 'playing';
    let deadline = startedAt + timing.turnMilliseconds;
    let result: PlayResult | null = null;
    let finishedAt: number | null = null;
    let phaseTimer: Timer | null = null;
    let botTimer: Timer | null = null;

    const remainingChoices = (): number[] => {
      const missed = new Set(
        state.guesses.filter((entry) => entry.round === state.round && !entry.correct).map((entry) => entry.footballerId),
      );
      return (help[state.round]?.choices ?? []).filter((footballerId) => !missed.has(footballerId));
    };

    const view = (): CareerView => {
      const mystery = mysteries[state.round];
      const aid = help[state.round];
      const open = stage === 'playing' ? state.revealed : (mystery?.path.length ?? 0);
      const last = state.guesses.at(-1);
      const choices = stage === 'playing' ? remainingChoices() : [];
      return {
        phase: stage,
        round: state.round + 1,
        totalRounds: state.mysteries.length,
        clues: (mystery?.path ?? []).slice(0, open).map((step) => ({ ...step, ...aid?.stats.get(step.clubId) })),
        totalClues: mystery?.path.length ?? 0,
        turn: state.turn,
        attemptsLeft: stage === 'playing' ? attemptsLeft(state) : 0,
        points: stage === 'playing' ? careerPoints(state) : 0,
        lastGuess:
          last && last.round === state.round ? { side: last.side, footballerId: last.footballerId, correct: last.correct } : null,
        answer: stage === 'playing' ? null : (mystery?.footballerId ?? null),
        deadlineIn: stage === 'finished' ? 0 : Math.max(0, deadline - now()),
        scores: { ...state.scores },
        result,
        ...(showsFacts && aid ? { facts: { ...aid.facts } } : {}),
        ...(choices.length > 0 ? { choices } : {}),
      };
    };

    const broadcast = () => {
      const current = view();
      SIDES.forEach((side) => context.send(side, { type: 'view', matchId: id, game: 'career', view: current }));
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
          finish(settleByScore(careerWinner(state), clock, first === 'x' ? 'o' : 'x'));
        } else {
          state = nextCareerRound(state);
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
        state = guessCareer(state, side, footballerId);
      } catch (error) {
        if (error instanceof CareerError) {
          return error.code === 'not-your-turn' ? 'not-your-turn' : 'invalid-action';
        }
        throw error;
      }
      clock.stop(side);
      if (state.phase === 'playing') {
        startTurn();
      } else {
        reveal();
      }
      return null;
    };

    const botGuess = (side: Side) => {
      botTimer = null;
      const mystery = currentMystery(state);
      if (stage !== 'playing' || state.turn !== side || !mystery) {
        return;
      }
      if (random() < botKnows(botLevel, state.revealed)) {
        guess(side, mystery.footballerId);
        return;
      }
      const tried = state.guesses.filter((entry) => entry.round === state.round).map((entry) => entry.footballerId ?? 0);
      const decoys = library.chainCandidates(market, mystery.footballerId, [mystery.footballerId, ...tried], DECOY_FAME, DECOYS);
      guess(side, decoys.length > 0 ? pick(decoys, random) : null);
    };

    function startTurn(): void {
      stopTimers();
      stage = 'playing';
      deadline = now() + timing.turnMilliseconds;
      const side = state.turn;
      clock.start([side]);
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
      game: 'career',
      seats,
      sideOf: (userId) => seatSide(seats, userId),
      start: startTurn,
      greeting: (side, opponentConnected) => ({
        type: 'session',
        session: {
          matchId: id,
          game: 'career',
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
      useJoker(_, joker) {
        const mystery = currentMystery(state);
        if (stage !== 'playing' || !mystery) {
          return { error: 'invalid-action' };
        }
        const facts = library.footballerFacts(mystery.footballerId);
        if (joker === 'first-letter') {
          return { reveal: { kind: 'initials', footballerId: mystery.footballerId, birthYear: false } };
        }
        if (joker === 'birth-year') {
          return { reveal: { kind: 'birth-year', birthYear: facts?.birthYear ?? null } };
        }
        if (joker === 'nationality') {
          return { reveal: { kind: 'country', countryId: facts?.countryId ?? null } };
        }
        if (joker === 'position') {
          return { reveal: { kind: 'position', position: facts?.position ?? null, birthYear: facts?.birthYear ?? null } };
        }
        return NO_JOKER();
      },
      finishedAt: () => finishedAt,
      record: () => ({
        game: 'career',
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
