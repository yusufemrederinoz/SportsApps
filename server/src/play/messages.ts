import type { ClientMessage, PlayDifficulty } from '@sportapps/protocol';

const TOKEN_MAX_LENGTH = 512;
const SHORT_TEXT_MAX_LENGTH = 64;
const DIFFICULTIES: readonly unknown[] = [1, 2, 3];

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
    case 'create-room':
      return text(fields.market, SHORT_TEXT_MAX_LENGTH) && difficulty(fields.difficulty)
        ? { type: fields.type, market: fields.market, difficulty: fields.difficulty }
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
    case 'leave':
      return text(fields.matchId, SHORT_TEXT_MAX_LENGTH) ? { type: 'leave', matchId: fields.matchId } : null;
    default:
      return null;
  }
}
