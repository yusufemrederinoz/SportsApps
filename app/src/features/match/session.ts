import {
  DEFAULT_RULES,
  MatchError,
  cellIndex,
  createMatch,
  skipTurn,
  submitAnswer,
  type CellPosition,
  type Grid,
  type MatchRules,
  type MatchState,
  type Side,
} from '@sportapps/game-core';

export type FeedbackKind = 'correct' | 'wrong' | 'already-used' | 'timeout' | 'bot-passed';

export interface Feedback {
  kind: FeedbackKind;
  side: Side;
  footballerName: string | null;
}

export interface PlayedFootballer {
  id: number;
  name: string;
  countryCode: string | null;
  role: string | null;
  hasPortrait: boolean;
}

export interface Claim {
  index: number;
  side: Side;
  turnNumber: number;
}

export interface MatchSession {
  match: MatchState;
  footballers: Readonly<Record<number, PlayedFootballer>>;
  feedback: Feedback | null;
  lastClaim: Claim | null;
  turnEndsAt: number;
}

export type SessionAction =
  | {
      type: 'answer';
      turnNumber: number;
      position: CellPosition;
      footballer: PlayedFootballer;
      correct: boolean;
      now: number;
    }
  | { type: 'skip'; turnNumber: number; reason: 'timeout' | 'bot-passed'; now: number };

function turnDeadline(rules: MatchRules, now: number): number {
  return now + rules.turnSeconds * 1000;
}

export function startSession(
  grid: Grid,
  startingSide: Side,
  now: number,
  rules: MatchRules = DEFAULT_RULES,
): MatchSession {
  return {
    match: createMatch(grid, startingSide, rules),
    footballers: {},
    feedback: null,
    lastClaim: null,
    turnEndsAt: turnDeadline(rules, now),
  };
}

export function reduceSession(session: MatchSession, action: SessionAction): MatchSession {
  const { match } = session;
  if (match.result || action.turnNumber !== match.turnNumber) {
    return session;
  }
  const side = match.turn;
  const turnEndsAt = turnDeadline(match.rules, action.now);

  if (action.type === 'skip') {
    return {
      ...session,
      match: skipTurn(match, side),
      feedback: { kind: action.reason, side, footballerName: null },
      turnEndsAt,
    };
  }

  try {
    const { state, outcome } = submitAnswer(match, side, action.position, action.footballer.id, () => action.correct);
    const claimed = outcome === 'claimed';
    return {
      match: state,
      footballers: claimed
        ? { ...session.footballers, [action.footballer.id]: action.footballer }
        : session.footballers,
      feedback: { kind: claimed ? 'correct' : outcome, side, footballerName: action.footballer.name },
      lastClaim: claimed ? { index: cellIndex(action.position), side, turnNumber: match.turnNumber } : session.lastClaim,
      turnEndsAt,
    };
  } catch (error) {
    if (error instanceof MatchError) {
      return session;
    }
    throw error;
  }
}

export function secondsLeft(session: MatchSession, now: number): number {
  return Math.max(0, Math.ceil((session.turnEndsAt - now) / 1000));
}
