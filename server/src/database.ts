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
  `
  CREATE TABLE matches (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    market TEXT NOT NULL,
    difficulty INTEGER NOT NULL,
    grid_id INTEGER NOT NULL,
    x_user_id TEXT REFERENCES users (id) ON DELETE SET NULL,
    o_user_id TEXT REFERENCES users (id) ON DELETE SET NULL,
    x_username TEXT NOT NULL,
    o_username TEXT NOT NULL,
    winner TEXT,
    reason TEXT NOT NULL,
    x_cells INTEGER NOT NULL,
    o_cells INTEGER NOT NULL,
    move_count INTEGER NOT NULL,
    started_at INTEGER NOT NULL,
    finished_at INTEGER NOT NULL
  ) STRICT;
  CREATE INDEX matches_x_user ON matches (x_user_id, finished_at);
  CREATE INDEX matches_o_user ON matches (o_user_id, finished_at);
  `,
  `
  ALTER TABLE matches ADD COLUMN game TEXT NOT NULL DEFAULT 'grid';
  `,
  `
  CREATE TABLE ratings (
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    game TEXT NOT NULL,
    points INTEGER NOT NULL,
    best_points INTEGER NOT NULL,
    matches INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, game)
  ) STRICT;
  CREATE INDEX ratings_game ON ratings (game, points);
  CREATE TABLE daily_rewards (
    user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    streak INTEGER NOT NULL,
    best_streak INTEGER NOT NULL,
    last_day TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  ) STRICT;
  CREATE TABLE wallets (
    user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    goals INTEGER NOT NULL CHECK (goals >= 0),
    updated_at INTEGER NOT NULL
  ) STRICT;
  CREATE TABLE goal_ledger (
    id INTEGER PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    balance INTEGER NOT NULL,
    reason TEXT NOT NULL,
    reference TEXT,
    created_at INTEGER NOT NULL,
    UNIQUE (user_id, reason, reference)
  ) STRICT;
  CREATE INDEX goal_ledger_user ON goal_ledger (user_id, id);
  ALTER TABLE matches ADD COLUMN x_points_change INTEGER;
  ALTER TABLE matches ADD COLUMN o_points_change INTEGER;
  `,
  `
  CREATE INDEX matches_finished ON matches (finished_at);
  CREATE TABLE puzzle_plays (
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    day TEXT NOT NULL,
    market TEXT NOT NULL,
    grid_id INTEGER NOT NULL,
    guesses_left INTEGER NOT NULL,
    finished_at INTEGER,
    reward_goals INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, day, market)
  ) STRICT;
  CREATE INDEX puzzle_plays_day ON puzzle_plays (day, market);
  CREATE TABLE puzzle_answers (
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    day TEXT NOT NULL,
    market TEXT NOT NULL,
    cell INTEGER NOT NULL,
    footballer_id INTEGER NOT NULL,
    answered_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, day, market, cell)
  ) STRICT;
  CREATE INDEX puzzle_answers_cell ON puzzle_answers (day, market, cell, footballer_id);
  `,
  `
  ALTER TABLE ratings ADD COLUMN rating INTEGER NOT NULL DEFAULT 1000;
  `,
  `
  ALTER TABLE matches ADD COLUMN bot_level INTEGER;
  `,
  `
  ALTER TABLE users ADD COLUMN username_pending INTEGER NOT NULL DEFAULT 0;
  `,
  `
  CREATE TABLE push_tokens (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    language TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  ) STRICT;
  CREATE INDEX push_tokens_user ON push_tokens (user_id);
  CREATE TABLE notification_log (
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    day TEXT NOT NULL,
    sent_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, kind, day)
  ) STRICT;
  `,
  `
  CREATE TABLE purchases (
    platform TEXT NOT NULL,
    transaction_id TEXT NOT NULL,
    user_id TEXT REFERENCES users (id) ON DELETE SET NULL,
    product_id TEXT NOT NULL,
    goals INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (platform, transaction_id)
  ) STRICT;
  CREATE INDEX purchases_user ON purchases (user_id);
  `,
  `
  CREATE TABLE ad_rewards (
    transaction_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    day TEXT NOT NULL,
    created_at INTEGER NOT NULL
  ) STRICT;
  CREATE INDEX ad_rewards_user_day ON ad_rewards (user_id, day);
  `,
  `
  CREATE TABLE password_resets (
    user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    attempts INTEGER NOT NULL,
    requests INTEGER NOT NULL,
    window_started_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  ) STRICT;
  `,
  `
  ALTER TABLE ad_rewards ADD COLUMN kind TEXT NOT NULL DEFAULT 'goals';
  CREATE TABLE point_protections (
    match_id TEXT NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    game TEXT NOT NULL,
    points INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (match_id, user_id)
  ) STRICT;
  `,
  `
  ALTER TABLE identities ADD COLUMN refresh_token TEXT;
  `,
  `
  CREATE TABLE bots (
    user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    market TEXT NOT NULL,
    created_at INTEGER NOT NULL
  ) STRICT;
  CREATE INDEX bots_market ON bots (market, created_at);
  `,
  `
  CREATE TABLE broadcasts (
    id INTEGER PRIMARY KEY,
    messages TEXT NOT NULL,
    fallback TEXT,
    devices INTEGER NOT NULL,
    skipped INTEGER NOT NULL,
    rejected INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL
  ) STRICT;
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
  if (database.isTransaction) {
    return work();
  }
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
