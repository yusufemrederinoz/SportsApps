import type { ApiErrorCode } from '@sportapps/protocol';

const STATUS_CODES: Record<ApiErrorCode, number> = {
  validation: 400,
  'invalid-username': 400,
  'invalid-email': 400,
  'invalid-password': 400,
  unauthorized: 401,
  'invalid-credentials': 401,
  'invalid-identity-token': 401,
  'not-found': 404,
  'email-taken': 409,
  'username-taken': 409,
  'rate-limited': 429,
  internal: 500,
  'provider-unavailable': 503,
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly statusCode: number;

  constructor(code: ApiErrorCode) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = STATUS_CODES[code];
  }
}
