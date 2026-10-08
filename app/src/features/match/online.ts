import type { Grid, MatchRules } from '@sportapps/game-core';
import type { MatchSnapshot, PlayMove, PlayResult } from '@sportapps/protocol';

import { reduceSession, startSession, type MatchSession, type PlayedFootballer } from './session';

export type FootballerLookup = (footballerId: number) => PlayedFootballer;

const UNKNOWN_NAME = '?';

export function unknownFootballer(id: number): PlayedFootballer {
  return { id, name: UNKNOWN_NAME, countryCode: null, role: null, hasPortrait: false };
}

export function footballerIdsOf(moves: readonly PlayMove[]): number[] {
  return Array.from(new Set(moves.flatMap((move) => (move.kind === 'answer' ? [move.footballerId] : []))));
}

export function applyMove(
  session: MatchSession,
  move: PlayMove,
  lookup: FootballerLookup,
  turnEndsAt: number,
): MatchSession {
  const reduced =
    move.kind === 'answer'
      ? reduceSession(session, {
          type: 'answer',
          turnNumber: move.turnNumber,
          position: move.cell,
          footballer: lookup(move.footballerId),
          correct: move.outcome === 'claimed',
          now: 0,
        })
      : reduceSession(session, { type: 'skip', turnNumber: move.turnNumber, reason: 'timeout', now: 0 });
  return reduced === session ? session : { ...reduced, turnEndsAt };
}

export function finishSession(session: MatchSession, result: PlayResult | null): MatchSession {
  if (!result || result.reason === 'score' || result.reason === 'speed' || session.match.result) {
    return session;
  }
  return { ...session, match: { ...session.match, result: { winner: result.winner, reason: result.reason } } };
}

export function sessionFromSnapshot(
  snapshot: MatchSnapshot,
  grid: Grid,
  lookup: FootballerLookup,
  receivedAt: number,
): MatchSession {
  const rules: MatchRules = {
    turnSeconds: snapshot.turnSeconds,
    maxConsecutiveMisses: snapshot.maxConsecutiveMisses,
  };
  const turnEndsAt = receivedAt + snapshot.turnEndsIn;
  const replayed = snapshot.moves.reduce(
    (session, move) => applyMove(session, move, lookup, turnEndsAt),
    startSession(grid, snapshot.startingSide, receivedAt, rules),
  );
  return { ...finishSession(replayed, snapshot.result), feedback: null, lastClaim: null, turnEndsAt };
}
