import type { DraftCandidateRow } from '@sportapps/football-data';
import {
  DRAFT_FORMATION,
  DRAFT_POSITIONS,
  DraftError,
  createDraft,
  currentClub,
  draftWinner,
  draftedIds,
  nextRound,
  openPositions,
  passRound,
  pickFootballer,
  roundComplete,
  type BotLevel,
  type DraftPosition,
  type Side,
} from '@sportapps/game-core';
import {
  DRAFT_PICK_SECONDS,
  type DraftView,
  type DraftViewPhase,
  type PlayDifficulty,
  type PlayErrorCode,
  type PlayResult,
} from '@sportapps/protocol';

import type { FootballLibrary } from '../football/library';
import { botLevelFor } from './bot';
import { NO_JOKER, SIDES, seatSide, type LiveRoom, type RoomFactory, type WaitRange } from './live-room';
import { TURN_GRACE_MILLISECONDS } from './room';

const SECOND = 1000;
const CLUB_POOL: Record<PlayDifficulty, number> = { 1: 16, 2: 32, 3: Number.POSITIVE_INFINITY };
const BOT_CANDIDATES = 40;
const BOT_SHORTLIST = 4;
const FAMOUS = 45;

export interface DraftTiming {
  pickMilliseconds: number;
  pauseMilliseconds: number;
  botPickMilliseconds: WaitRange;
}

export const DEFAULT_DRAFT_TIMING: DraftTiming = {
  pickMilliseconds: DRAFT_PICK_SECONDS * SECOND,
  pauseMilliseconds: 3000,
  botPickMilliseconds: { minimum: 4000, maximum: 14000 },
};

export type DraftLibrary = Pick<FootballLibrary, 'draftClubs' | 'draftEntry' | 'draftCandidates'>;

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

function isPosition(value: string): value is DraftPosition {
  return (DRAFT_POSITIONS as readonly string[]).includes(value);
}

export function chooseBotPick(
  candidates: readonly DraftCandidateRow[],
  level: BotLevel,
  random: () => number,
): DraftCandidateRow | null {
  if (candidates.length === 0) {
    return null;
  }
  const ranked = [...candidates].sort((first, second) => second.value - first.value);
  if (level === 3) {
    return ranked[0] ?? null;
  }
  if (level === 2) {
    return pick(ranked.slice(0, BOT_SHORTLIST), random);
  }
  const famous = candidates.filter((candidate) => candidate.fame >= FAMOUS);
  return pick(famous.length > 0 ? famous : candidates, random);
}

export function createDraftRoomFactory(library: DraftLibrary, timing: DraftTiming = DEFAULT_DRAFT_TIMING): RoomFactory {
  return (context) => {
    const { id, kind, market, difficulty, seats, now, random } = context;
    const pool = library.draftClubs(market).slice(0, CLUB_POOL[difficulty]);
    if (pool.length < DRAFT_FORMATION.length) {
      return null;
    }

    const startedAt = now();
    const botTimers = new Map<Side, Timer>();
    const botLevel = botLevelFor(difficulty, context.rivalOutcomes);
    const botSides = SIDES.filter((side) => seats[side].userId === null);
    let state = createDraft(shuffle(pool, random).slice(0, DRAFT_FORMATION.length));
    let stage: DraftViewPhase = 'playing';
    let deadline = startedAt + timing.pickMilliseconds;
    let result: PlayResult | null = null;
    let finishedAt: number | null = null;
    let phaseTimer: Timer | null = null;

    const view = (): DraftView => ({
      phase: stage,
      metric: 'assists',
      totalRounds: state.clubs.length,
      round: Math.min(state.round + 1, state.clubs.length),
      clubs: state.clubs.slice(0, state.round + 1),
      deadlineIn: stage === 'finished' ? 0 : Math.max(0, deadline - now()),
      lineups: {
        x: state.lineups.x.map((slot) => ({ ...slot })),
        o: state.lineups.o.map((slot) => ({ ...slot })),
      },
      picked: { ...state.picked },
      scores: { ...state.scores },
      result,
    });

    const broadcast = () => {
      const current = view();
      SIDES.forEach((side) => context.send(side, { type: 'view', matchId: id, game: 'draft', view: current }));
    };

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

    const finish = (outcome: PlayResult) => {
      stopTimers();
      stage = 'finished';
      result = outcome;
      finishedAt = now();
      broadcast();
      context.onFinished(live, outcome);
    };

    const advance = () => {
      state = nextRound(state);
      if (state.phase === 'finished') {
        finish({ winner: draftWinner(state), reason: 'score' });
      } else {
        startRound();
      }
    };

    const pause = () => {
      stopBots();
      stage = 'pause';
      deadline = now() + timing.pauseMilliseconds;
      schedule(advance, timing.pauseMilliseconds);
      broadcast();
    };

    const settle = () => {
      if (roundComplete(state)) {
        pause();
      } else {
        broadcast();
      }
    };

    const choose = (side: Side, footballerId: number): PlayErrorCode | null => {
      const club = currentClub(state);
      if (stage !== 'playing' || club === null) {
        return 'invalid-action';
      }
      const entry = library.draftEntry(footballerId, club);
      if (!entry || !isPosition(entry.position)) {
        return 'invalid-action';
      }
      try {
        state = pickFootballer(state, side, { footballerId, position: entry.position, value: entry.value });
      } catch (error) {
        if (error instanceof DraftError) {
          return 'invalid-action';
        }
        throw error;
      }
      settle();
      return null;
    };

    const botPick = (side: Side) => {
      const club = currentClub(state);
      if (stage !== 'playing' || club === null || state.picked[side]) {
        return;
      }
      const candidates = library.draftCandidates(
        market,
        club,
        openPositions(state.lineups[side]),
        draftedIds(state),
        BOT_CANDIDATES,
      );
      const choice = chooseBotPick(candidates, botLevel, random);
      if (!choice || choose(side, choice.id) !== null) {
        state = passRound(state, side);
        settle();
      }
    };

    const expire = () => {
      if (stage !== 'playing') {
        return;
      }
      SIDES.forEach((side) => {
        state = passRound(state, side);
      });
      pause();
    };

    function startRound(): void {
      stage = 'playing';
      deadline = now() + timing.pickMilliseconds;
      schedule(expire, timing.pickMilliseconds + TURN_GRACE_MILLISECONDS);
      broadcast();
      botSides.forEach((side) => {
        botTimers.set(
          side,
          setTimeout(() => {
            botTimers.delete(side);
            botPick(side);
          }, timing.botPickMilliseconds.minimum + random() * Math.max(0, timing.botPickMilliseconds.maximum - timing.botPickMilliseconds.minimum)),
        );
      });
    }

    const live: LiveRoom = {
      id,
      kind,
      game: 'draft',
      seats,
      sideOf: (userId) => seatSide(seats, userId),

      start() {
        startRound();
      },

      greeting: (side, opponentConnected) => ({
        type: 'session',
        session: {
          matchId: id,
          game: 'draft',
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
        return message.action.kind === 'pick' ? choose(side, message.action.footballerId) : 'invalid-action';
      },

      forfeit(side) {
        if (stage !== 'finished') {
          finish({ winner: side === 'x' ? 'o' : 'x', reason: 'forfeit' });
        }
      },

      useJoker: NO_JOKER,
      finishedAt: () => finishedAt,

      record: () => ({
        game: 'draft',
        market,
        difficulty,
        gridId: 0,
        scores: state.scores,
        moveCount: draftedIds(state).length,
        startedAt,
      }),

      dispose: stopTimers,
    };
    return live;
  };
}
