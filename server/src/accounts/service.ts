import { createHash, randomInt, randomUUID } from 'node:crypto';

import { normalizeName } from '@sportapps/game-core';
import {
  RESET_CODE_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  isValidEmail,
  isValidPassword,
  isValidUsername,
  keepUsernameCharacters,
  type Account,
  type AuthResponse,
  type ForgotPasswordRequest,
  type IdentityProvider,
  type LoginRequest,
  type RegisterRequest,
  type ResetPasswordRequest,
} from '@sportapps/protocol';

import { transaction, type Database } from '../database';
import { ApiError } from '../http/errors';
import type { Mailer } from '../mail/mailer';
import { passwordResetMail } from '../mail/texts';
import type { IdentityVerifiers } from './identity';
import { hashPassword, verifyPassword } from './passwords';
import { createAccountRepository, type UserRow } from './repository';
import { createSessionToken, hashToken } from './tokens';

const DAY = 24 * 60 * 60 * 1000;
const SESSION_REFRESH_INTERVAL = 60 * 60 * 1000;
const GUEST_PREFIX = 'guest';
const FALLBACK_PREFIX = 'player';
const SUFFIX_DIGITS = 6;
const MINUTE = 60 * 1000;
const RESET_CODE_MINUTES = 15;
const RESET_CODE_INTERVAL = MINUTE;
const RESET_CODE_ATTEMPTS = 5;
const RESET_CODES_PER_DAY = 5;
const UNKNOWN_PASSWORD_HASH = [
  'scrypt',
  2 ** 15,
  8,
  1,
  Buffer.alloc(16).toString('base64url'),
  Buffer.alloc(64).toString('base64url'),
].join('$');

export interface AccountServiceOptions {
  sessionDays: number;
  verifiers?: IdentityVerifiers;
  mailer?: Mailer;
  onMailError?: (error: unknown) => void;
  now?: () => number;
}

export interface AuthenticatedSession {
  user: UserRow;
  token: string;
}

function hashResetCode(userId: string, code: string): string {
  return createHash('sha256').update(`${userId}:${code}`).digest('hex');
}

export function usernameKey(username: string): string {
  return normalizeName(username).replaceAll(' ', '');
}

export function createAccountService(database: Database, options: AccountServiceOptions) {
  const repository = createAccountRepository(database);
  const now = options.now ?? Date.now;
  const sessionLifetime = options.sessionDays * DAY;
  const verifiers = options.verifiers ?? {};
  const onMailError = options.onMailError ?? (() => undefined);

  function startSession(user: UserRow): AuthResponse {
    const time = now();
    const { token, hash } = createSessionToken();
    repository.insertSession(hash, user.id, time, time + sessionLifetime);
    return { token, account: repository.toAccount(user) };
  }

  function randomSuffix(): string {
    return String(randomInt(10 ** SUFFIX_DIGITS)).padStart(SUFFIX_DIGITS, '0');
  }

  function isUsernameFree(username: string): boolean {
    return repository.findUserByUsernameKey(usernameKey(username)) === undefined;
  }

  function availableUsername(preferred: string): string {
    const base = Array.from(keepUsernameCharacters(preferred))
      .slice(0, USERNAME_MAX_LENGTH - SUFFIX_DIGITS)
      .join('');
    const stem = Array.from(base).length >= USERNAME_MIN_LENGTH ? base : FALLBACK_PREFIX;
    if (stem !== GUEST_PREFIX && isUsernameFree(stem)) {
      return stem;
    }
    for (;;) {
      const candidate = `${stem}${randomSuffix()}`;
      if (isUsernameFree(candidate)) {
        return candidate;
      }
    }
  }

  function provisionalUsername(): string {
    for (;;) {
      const candidate = `${FALLBACK_PREFIX}${randomSuffix()}`;
      if (isUsernameFree(candidate)) {
        return candidate;
      }
    }
  }

  function createUser(username: string, isGuest: boolean, usernamePending = false): UserRow {
    const time = now();
    const user: UserRow = {
      id: randomUUID(),
      username,
      username_key: usernameKey(username),
      is_guest: isGuest ? 1 : 0,
      username_pending: usernamePending ? 1 : 0,
      created_at: time,
      updated_at: time,
    };
    repository.insertUser(user);
    return user;
  }

  return {
    createGuest(): AuthResponse {
      return transaction(database, () => startSession(createUser(availableUsername(GUEST_PREFIX), true)));
    },

    authenticate(token: string): AuthenticatedSession | null {
      const hash = hashToken(token);
      const session = repository.findSession(hash);
      const time = now();
      if (!session || session.expires_at <= time) {
        return null;
      }
      const user = repository.findUser(session.user_id);
      if (!user) {
        return null;
      }
      if (time - session.last_used_at >= SESSION_REFRESH_INTERVAL) {
        repository.extendSession(hash, time, time + sessionLifetime);
      }
      return { user, token };
    },

    account(user: UserRow): Account {
      return repository.toAccount(user);
    },

    isUsernameTaken(username: string): boolean {
      return !isUsernameFree(username);
    },

    async register(input: RegisterRequest): Promise<AuthResponse> {
      const email = input.email.trim();
      const username = input.username.trim();
      if (!isValidUsername(username)) {
        throw new ApiError('invalid-username');
      }
      if (!isValidEmail(email)) {
        throw new ApiError('invalid-email');
      }
      if (!isValidPassword(input.password)) {
        throw new ApiError('invalid-password');
      }
      const passwordHash = await hashPassword(input.password);
      const emailKey = email.toLowerCase();

      return transaction(database, () => {
        if (repository.findCredentialByEmailKey(emailKey)) {
          throw new ApiError('email-taken');
        }
        if (!isUsernameFree(username)) {
          throw new ApiError('username-taken');
        }
        const user = createUser(username, false);
        repository.insertCredential(user.id, email, emailKey, passwordHash, now());
        return startSession(user);
      });
    },

    async login(input: LoginRequest): Promise<AuthResponse> {
      const credential = repository.findCredentialByEmailKey(input.email.trim().toLowerCase());
      const matches = await verifyPassword(input.password, credential?.password_hash ?? UNKNOWN_PASSWORD_HASH);
      const user = credential && matches ? repository.findUser(credential.user_id) : undefined;
      if (!user) {
        throw new ApiError('invalid-credentials');
      }
      return startSession(user);
    },

    requestPasswordReset(input: ForgotPasswordRequest): void {
      const { mailer } = options;
      if (!mailer) {
        throw new ApiError('mail-unavailable');
      }
      const credential = repository.findCredentialByEmailKey(input.email.trim().toLowerCase());
      if (!credential) {
        return;
      }
      const time = now();
      const previous = repository.findPasswordReset(credential.user_id);
      const sameDay = previous !== undefined && time - previous.window_started_at < DAY;
      const tooSoon = previous !== undefined && time - previous.created_at < RESET_CODE_INTERVAL;
      if (tooSoon || (previous && sameDay && previous.requests >= RESET_CODES_PER_DAY)) {
        return;
      }
      const code = String(randomInt(10 ** RESET_CODE_LENGTH)).padStart(RESET_CODE_LENGTH, '0');
      repository.savePasswordReset({
        user_id: credential.user_id,
        code_hash: hashResetCode(credential.user_id, code),
        attempts: 0,
        requests: previous && sameDay ? previous.requests + 1 : 1,
        window_started_at: previous && sameDay ? previous.window_started_at : time,
        created_at: time,
        expires_at: time + RESET_CODE_MINUTES * MINUTE,
      });
      void mailer(passwordResetMail(credential.email, input.language, code, RESET_CODE_MINUTES)).catch(onMailError);
    },

    async resetPassword(input: ResetPasswordRequest): Promise<AuthResponse> {
      if (!isValidPassword(input.password)) {
        throw new ApiError('invalid-password');
      }
      const credential = repository.findCredentialByEmailKey(input.email.trim().toLowerCase());
      const reset = credential ? repository.findPasswordReset(credential.user_id) : undefined;
      if (!credential || !reset || reset.expires_at <= now() || reset.attempts >= RESET_CODE_ATTEMPTS) {
        throw new ApiError('invalid-reset-code');
      }
      if (reset.code_hash !== hashResetCode(credential.user_id, input.code.trim())) {
        repository.countPasswordResetAttempt(credential.user_id);
        throw new ApiError('invalid-reset-code');
      }
      const passwordHash = await hashPassword(input.password);

      return transaction(database, () => {
        const user = repository.findUser(credential.user_id);
        if (!user || repository.findPasswordReset(user.id)?.code_hash !== reset.code_hash) {
          throw new ApiError('invalid-reset-code');
        }
        repository.setPassword(user.id, passwordHash);
        repository.deletePasswordReset(user.id);
        repository.deleteUserSessions(user.id);
        return startSession(user);
      });
    },

    async signInWithIdentity(provider: IdentityProvider, token: string): Promise<AuthResponse> {
      const verify = verifiers[provider];
      if (!verify) {
        throw new ApiError('provider-unavailable');
      }
      const identity = await verify(token).catch(() => {
        throw new ApiError('invalid-identity-token');
      });

      return transaction(database, () => {
        const existingUserId = repository.findIdentityUserId(provider, identity.subject);
        const existing = existingUserId ? repository.findUser(existingUserId) : undefined;
        if (existing) {
          return startSession(existing);
        }
        const user = createUser(provisionalUsername(), false, true);
        repository.insertIdentity(provider, identity.subject, user.id, identity.email, now());
        return startSession(user);
      });
    },

    chooseUsername(user: UserRow, input: string): Account {
      const username = input.trim();
      if (user.username_pending !== 1) {
        throw new ApiError('username-locked');
      }
      if (!isValidUsername(username)) {
        throw new ApiError('invalid-username');
      }
      return transaction(database, () => {
        if (!isUsernameFree(username)) {
          throw new ApiError('username-taken');
        }
        repository.setUsername(user.id, username, usernameKey(username), now());
        return repository.toAccount({ ...user, username, username_pending: 0 });
      });
    },

    logout(token: string): void {
      repository.deleteSession(hashToken(token));
    },

    deleteAccount(userId: string): void {
      transaction(database, () => repository.deleteUser(userId));
    },

    removeExpiredSessions(): void {
      repository.deleteExpiredSessions(now());
    },
  };
}

export type AccountService = ReturnType<typeof createAccountService>;
