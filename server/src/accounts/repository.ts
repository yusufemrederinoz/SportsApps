import type { Account, IdentityProvider } from '@sportapps/protocol';

import type { Database } from '../database';

export interface UserRow {
  id: string;
  username: string;
  username_key: string;
  is_guest: number;
  created_at: number;
  updated_at: number;
}

export interface CredentialRow {
  user_id: string;
  email: string;
  email_key: string;
  password_hash: string;
}

export interface SessionRow {
  token_hash: string;
  user_id: string;
  last_used_at: number;
  expires_at: number;
}

export function createAccountRepository(database: Database) {
  const one = <T>(sql: string, ...parameters: (string | number | null)[]) =>
    database.prepare(sql).get(...parameters) as T | undefined;
  const many = <T>(sql: string, ...parameters: (string | number | null)[]) =>
    database.prepare(sql).all(...parameters) as T[];
  const run = (sql: string, ...parameters: (string | number | null)[]) => {
    database.prepare(sql).run(...parameters);
  };

  return {
    insertUser(user: UserRow): void {
      run(
        'INSERT INTO users (id, username, username_key, is_guest, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        user.id,
        user.username,
        user.username_key,
        user.is_guest,
        user.created_at,
        user.updated_at,
      );
    },

    findUser(id: string): UserRow | undefined {
      return one<UserRow>('SELECT * FROM users WHERE id = ?', id);
    },

    findUserByUsernameKey(usernameKey: string): UserRow | undefined {
      return one<UserRow>('SELECT * FROM users WHERE username_key = ?', usernameKey);
    },

    findCredentialByEmailKey(emailKey: string): CredentialRow | undefined {
      return one<CredentialRow>('SELECT * FROM credentials WHERE email_key = ?', emailKey);
    },

    insertCredential(userId: string, email: string, emailKey: string, passwordHash: string, now: number): void {
      run(
        'INSERT INTO credentials (user_id, email, email_key, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
        userId,
        email,
        emailKey,
        passwordHash,
        now,
      );
    },

    findIdentityUserId(provider: IdentityProvider, subject: string): string | undefined {
      return one<{ user_id: string }>('SELECT user_id FROM identities WHERE provider = ? AND subject = ?', provider, subject)?.user_id;
    },

    insertIdentity(provider: IdentityProvider, subject: string, userId: string, email: string | null, now: number): void {
      run(
        'INSERT INTO identities (provider, subject, user_id, email, created_at) VALUES (?, ?, ?, ?, ?)',
        provider,
        subject,
        userId,
        email,
        now,
      );
    },

    insertSession(tokenHash: string, userId: string, now: number, expiresAt: number): void {
      run(
        'INSERT INTO sessions (token_hash, user_id, created_at, last_used_at, expires_at) VALUES (?, ?, ?, ?, ?)',
        tokenHash,
        userId,
        now,
        now,
        expiresAt,
      );
    },

    findSession(tokenHash: string): SessionRow | undefined {
      return one<SessionRow>('SELECT token_hash, user_id, last_used_at, expires_at FROM sessions WHERE token_hash = ?', tokenHash);
    },

    extendSession(tokenHash: string, now: number, expiresAt: number): void {
      run('UPDATE sessions SET last_used_at = ?, expires_at = ? WHERE token_hash = ?', now, expiresAt, tokenHash);
    },

    deleteSession(tokenHash: string): void {
      run('DELETE FROM sessions WHERE token_hash = ?', tokenHash);
    },

    deleteExpiredSessions(now: number): void {
      run('DELETE FROM sessions WHERE expires_at <= ?', now);
    },

    toAccount(user: UserRow): Account {
      const credential = one<{ email: string }>('SELECT email FROM credentials WHERE user_id = ?', user.id);
      const identities = many<{ provider: IdentityProvider; email: string | null }>(
        'SELECT provider, email FROM identities WHERE user_id = ? ORDER BY provider',
        user.id,
      );
      return {
        id: user.id,
        username: user.username,
        isGuest: user.is_guest === 1,
        email: credential?.email ?? identities.find((identity) => identity.email)?.email ?? null,
        hasPassword: credential !== undefined,
        providers: identities.map((identity) => identity.provider),
        createdAt: user.created_at,
      };
    },
  };
}

export type AccountRepository = ReturnType<typeof createAccountRepository>;
