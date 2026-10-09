import { randomUUID } from 'node:crypto';

import { usernameKey } from '../accounts/service';
import { transaction, type Database } from '../database';
import { createBotName } from './bot';

export const ROSTER_SIZE = 48;
export const ROSTER_MINIMUM = 12;
export const PLAYERS_PER_BOT = 25;
export const RECENT_OPPONENTS = 8;

export interface RosterBot {
  id: string;
  username: string;
}

export interface BotRoster {
  pick(market: string, opponentId: string, busy: ReadonlySet<string>): RosterBot | null;
  activeSize(): number;
}

export interface RosterOptions {
  now?: () => number;
  random?: () => number;
}

export function createBotRoster(database: Database, options: RosterOptions = {}): BotRoster {
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  const selectBots = database.prepare(
    `SELECT b.user_id AS id, u.username AS username FROM bots b JOIN users u ON u.id = b.user_id
     WHERE b.market = ? ORDER BY b.created_at, b.rowid`,
  );
  const selectTaken = database.prepare('SELECT 1 AS taken FROM users WHERE username_key = ?');
  const insertUser = database.prepare(
    'INSERT INTO users (id, username, username_key, is_guest, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)',
  );
  const insertBot = database.prepare('INSERT INTO bots (user_id, market, created_at) VALUES (?, ?, ?)');
  const countPlayers = database.prepare(
    'SELECT COUNT(DISTINCT user_id) AS value FROM ratings WHERE user_id NOT IN (SELECT user_id FROM bots)',
  );
  const selectRecent = database.prepare(
    `SELECT CASE WHEN x_user_id = ? THEN o_user_id ELSE x_user_id END AS id FROM matches
     WHERE x_user_id = ? OR o_user_id = ? ORDER BY finished_at DESC, rowid DESC LIMIT ?`,
  );

  const listed = (market: string) => selectBots.all(market) as unknown as RosterBot[];
  const isTaken = (username: string) => selectTaken.get(usernameKey(username)) !== undefined;

  const filled = (market: string): RosterBot[] => {
    const known = listed(market);
    if (known.length >= ROSTER_SIZE) {
      return known;
    }
    return transaction(database, () => {
      for (let missing = ROSTER_SIZE - known.length; missing > 0; missing -= 1) {
        const id = randomUUID();
        const username = createBotName(market, isTaken, random);
        const time = now();
        insertUser.run(id, username, usernameKey(username), time, time);
        insertBot.run(id, market, time);
      }
      return listed(market);
    });
  };

  const activeSize = () => {
    const players = Number((countPlayers.get() as { value: number }).value);
    return Math.max(ROSTER_MINIMUM, ROSTER_SIZE - Math.floor(players / PLAYERS_PER_BOT));
  };

  return {
    activeSize,

    pick(market, opponentId, busy) {
      const free = filled(market)
        .slice(0, activeSize())
        .filter((bot) => !busy.has(bot.id));
      if (free.length === 0) {
        return null;
      }
      const recent = new Set(
        (selectRecent.all(opponentId, opponentId, opponentId, RECENT_OPPONENTS) as unknown as { id: string | null }[]).map(
          (row) => row.id,
        ),
      );
      const fresh = free.filter((bot) => !recent.has(bot.id));
      const pool = fresh.length > 0 ? fresh : free;
      return pool[Math.floor(random() * pool.length)] ?? null;
    },
  };
}
