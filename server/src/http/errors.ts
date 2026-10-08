import type { ApiErrorCode } from '@sportapps/protocol';

const STATUS_CODES: Record<ApiErrorCode, number> = {
  validation: 400,
  'invalid-username': 400,
  'invalid-email': 400,
  'invalid-password': 400,
  'invalid-reset-code': 400,
  'purchase-invalid': 400,
  unauthorized: 401,
  'invalid-credentials': 401,
  'invalid-identity-token': 401,
  'guest-purchase': 403,
  'not-found': 404,
  'already-signed-in': 409,
  'purchase-used': 409,
  'email-taken': 409,
  'username-taken': 409,
  'username-locked': 409,
  'puzzle-finished': 409,
  'cell-taken': 409,
  'rate-limited': 429,
  internal: 500,
  'provider-unavailable': 503,
  'puzzle-unavailable': 503,
  'store-unavailable': 503,
  'mail-unavailable': 503,
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
