import type { RequestErrorCode } from '@/api/client';

export const ERROR_KEYS = {
  network: 'errors.network',
  unconfigured: 'errors.unconfigured',
  validation: 'errors.validation',
  unauthorized: 'errors.unauthorized',
  'already-signed-in': 'errors.alreadySignedIn',
  'invalid-credentials': 'errors.invalidCredentials',
  'email-taken': 'errors.emailTaken',
  'username-taken': 'errors.usernameTaken',
  'invalid-username': 'errors.invalidUsername',
  'invalid-email': 'errors.invalidEmail',
  'invalid-password': 'errors.invalidPassword',
  'provider-unavailable': 'errors.providerUnavailable',
  'invalid-identity-token': 'errors.invalidIdentityToken',
  'rate-limited': 'errors.rateLimited',
  'not-found': 'errors.internal',
  internal: 'errors.internal',
} as const satisfies Record<RequestErrorCode, string>;
