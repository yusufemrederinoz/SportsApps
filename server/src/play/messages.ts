import {
  GAME_IDS,
  JOKER_IDS,
  type ClientMessage,
  type GameAction,
  type GameId,
  type JokerId,
  type JokerTarget,
  type PlayDifficulty,
} from '@sportapps/protocol';

const TOKEN_MAX_LENGTH = 512;
const SHORT_TEXT_MAX_LENGTH = 64;
const DIFFICULTIES: readonly unknown[] = [1, 2, 3];
const HAND_LIMIT = 16;

type Fields = Record<string, unknown>;

function text(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

function integer(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function difficulty(value: unknown): value is PlayDifficulty {
  return DIFFICULTIES.includes(value);
}

function cell(value: unknown): value is { row: number; column: number } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const fields = value as Fields;
  return integer(fields.row) && integer(fields.column);
}

function game(value: unknown): value is GameId | undefined {
  return value === undefined || (GAME_IDS as readonly unknown[]).includes(value);
}

function joker(value: unknown): value is JokerId {
  return (JOKER_IDS as readonly unknown[]).includes(value);
}

function jokerTarget(value: unknown): JokerTarget | null {
  if (value === undefined) {
    return {};
  }
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const fields = value as Fields;
  if (fields.cell !== undefined && !cell(fields.cell)) {
    return null;
  }
  if (fields.footballerId !== undefined && !integer(fields.footballerId)) {
    return null;
  }
  return {
    ...(cell(fields.cell) ? { cell: { row: fields.cell.row, column: fields.cell.column } } : {}),
    ...(integer(fields.footballerId) ? { footballerId: fields.footballerId } : {}),
  };
}

function action(value: unknown): GameAction | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const fields = value as Fields;
  if (fields.kind === 'play' && integer(fields.footballerId)) {
    return { kind: 'play', footballerId: fields.footballerId };
  }
  if (fields.kind === 'pick' && integer(fields.footballerId)) {
    return { kind: 'pick', footballerId: fields.footballerId };
  }
  if (fields.kind === 'choose' && integer(fields.footballerId)) {
    return { kind: 'choose', footballerId: fields.footballerId };
  }
  if (fields.kind === 'link' && integer(fields.footballerId)) {
    return { kind: 'link', footballerId: fields.footballerId };
  }
  if (fields.kind === 'name' && integer(fields.footballerId)) {
    return { kind: 'name', footballerId: fields.footballerId };
  }
  if (fields.kind === 'bid' && integer(fields.amount)) {
    return { kind: 'bid', amount: fields.amount };
  }
  if (fields.kind === 'challenge') {
    return { kind: 'challenge' };
  }
  if (
    fields.kind === 'hand' &&
    Array.isArray(fields.footballerIds) &&
    fields.footballerIds.length <= HAND_LIMIT &&
    fields.footballerIds.every(integer)
  ) {
    return { kind: 'hand', footballerIds: [...fields.footballerIds] };
  }
  return null;
}

export function parseClientMessage(raw: string): ClientMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const fields = parsed as Fields;
  switch (fields.type) {
    case 'hello':
      return text(fields.token, TOKEN_MAX_LENGTH) &&
        integer(fields.protocol) &&
        text(fields.dataVersion, SHORT_TEXT_MAX_LENGTH)
        ? { type: 'hello', token: fields.token, protocol: fields.protocol, dataVersion: fields.dataVersion }
        : null;
    case 'queue':
    case 'play-bot':
    case 'create-room':
      return text(fields.market, SHORT_TEXT_MAX_LENGTH) && difficulty(fields.difficulty) && game(fields.game)
        ? { type: fields.type, market: fields.market, difficulty: fields.difficulty, game: fields.game ?? 'grid' }
        : null;
    case 'join-room':
      return text(fields.code, SHORT_TEXT_MAX_LENGTH) ? { type: 'join-room', code: fields.code } : null;
    case 'cancel':
      return { type: 'cancel' };
    case 'ping':
      return { type: 'ping' };
    case 'answer':
      return text(fields.matchId, SHORT_TEXT_MAX_LENGTH) &&
        integer(fields.turnNumber) &&
        cell(fields.cell) &&
        integer(fields.footballerId)
        ? {
            type: 'answer',
            matchId: fields.matchId,
            turnNumber: fields.turnNumber,
            cell: { row: fields.cell.row, column: fields.cell.column },
            footballerId: fields.footballerId,
          }
        : null;
    case 'act': {
      const parsed = action(fields.action);
      return text(fields.matchId, SHORT_TEXT_MAX_LENGTH) && parsed
        ? { type: 'act', matchId: fields.matchId, action: parsed }
        : null;
    }
    case 'joker': {
      const target = jokerTarget(fields.target);
      return text(fields.matchId, SHORT_TEXT_MAX_LENGTH) && joker(fields.joker) && target
        ? { type: 'joker', matchId: fields.matchId, joker: fields.joker, target }
        : null;
    }
    case 'leave':
      return text(fields.matchId, SHORT_TEXT_MAX_LENGTH) ? { type: 'leave', matchId: fields.matchId } : null;
    default:
      return null;
  }
}
