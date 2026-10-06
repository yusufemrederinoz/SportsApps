import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export type Database = DatabaseSync;

const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    username_key TEXT NOT NULL UNIQUE,
    is_guest INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  ) STRICT;
  CREATE TABLE credentials (
    user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    email_key TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  ) STRICT;
  CREATE TABLE identities (
    provider TEXT NOT NULL,
    subject TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    email TEXT,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (provider, subject)
  ) STRICT;
  CREATE INDEX identities_user ON identities (user_id);
  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    last_used_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  ) STRICT;
  CREATE INDEX sessions_user ON sessions (user_id);
  CREATE INDEX sessions_expiry ON sessions (expires_at);
  `,
];

export function migrate(database: Database, now: number = Date.now()): void {
  database.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL) STRICT',
  );
  const applied = new Set(
    database
      .prepare('SELECT version FROM schema_migrations')
      .all()
      .map((row) => Number(row.version)),
  );
  MIGRATIONS.forEach((statements, index) => {
    const version = index + 1;
    if (applied.has(version)) {
      return;
    }
    transaction(database, () => {
      database.exec(statements);
      database.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(version, now);
    });
  });
}

export function transaction<T>(database: Database, work: () => T): T {
  database.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    database.exec('COMMIT');
    return result;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

export function openDatabase(path: string): Database {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }
  const database = new DatabaseSync(path);
  database.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  migrate(database);
  return database;
}
