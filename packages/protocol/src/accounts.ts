export const API_PREFIX = '/v1';

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 16;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const EMAIL_MAX_LENGTH = 254;

const USERNAME_PATTERN = /^[\p{L}\p{N}_]+$/u;
const USERNAME_CHARACTER = /[\p{L}\p{N}_]/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type IdentityProvider = 'google' | 'apple';

export interface Account {
  id: string;
  username: string;
  isGuest: boolean;
  email: string | null;
  hasPassword: boolean;
  providers: IdentityProvider[];
  createdAt: number;
}

export interface AuthResponse {
  token: string;
  account: Account;
}

export interface AccountResponse {
  account: Account;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface IdentitySignInRequest {
  token: string;
}

export type ApiErrorCode =
  | 'validation'
  | 'unauthorized'
  | 'already-signed-in'
  | 'invalid-credentials'
  | 'email-taken'
  | 'username-taken'
  | 'invalid-username'
  | 'invalid-email'
  | 'invalid-password'
  | 'provider-unavailable'
  | 'invalid-identity-token'
  | 'rate-limited'
  | 'not-found'
  | 'puzzle-finished'
  | 'cell-taken'
  | 'puzzle-unavailable'
  | 'internal';

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
  };
}

export const PASSWORD_RULES = ['length', 'uppercase', 'lowercase', 'digit'] as const;

export type PasswordRule = (typeof PASSWORD_RULES)[number];

const PASSWORD_CHECKS: Record<PasswordRule, (value: string) => boolean> = {
  length: (value) => value.length >= PASSWORD_MIN_LENGTH,
  uppercase: (value) => /\p{Lu}/u.test(value),
  lowercase: (value) => /\p{Ll}/u.test(value),
  digit: (value) => /\p{Nd}/u.test(value),
};

export function unmetPasswordRules(value: string): PasswordRule[] {
  return PASSWORD_RULES.filter((rule) => !PASSWORD_CHECKS[rule](value));
}

export function isValidPassword(value: string): boolean {
  return value.length <= PASSWORD_MAX_LENGTH && unmetPasswordRules(value).length === 0;
}

export function isValidUsername(value: string): boolean {
  const length = Array.from(value).length;
  return length >= USERNAME_MIN_LENGTH && length <= USERNAME_MAX_LENGTH && USERNAME_PATTERN.test(value);
}

export function keepUsernameCharacters(value: string): string {
  return Array.from(value)
    .filter((character) => USERNAME_CHARACTER.test(character))
    .join('');
}

export function isValidEmail(value: string): boolean {
  return value.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(value);
}
