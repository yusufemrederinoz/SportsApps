import { WELCOME_GOALS, type GoalEntry, type GoalReason, type WalletResponse } from '@sportapps/protocol';

import { transaction, type Database } from '../database';

const LEDGER_LIMIT = 50;

interface EntryRow {
  amount: number;
  balance: number;
  reason: string;
  created_at: number;
}

export function createWallet(database: Database, now: () => number) {
  const selectWallet = database.prepare('SELECT goals FROM wallets WHERE user_id = ?');
  const insertWallet = database.prepare('INSERT INTO wallets (user_id, goals, updated_at) VALUES (?, 0, ?)');
  const updateWallet = database.prepare('UPDATE wallets SET goals = ?, updated_at = ? WHERE user_id = ?');
  const selectEntry = database.prepare('SELECT 1 FROM goal_ledger WHERE user_id = ? AND reason = ? AND reference = ?');
  const insertEntry = database.prepare(
    'INSERT INTO goal_ledger (user_id, amount, balance, reason, reference, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const selectEntries = database.prepare(
    'SELECT amount, balance, reason, created_at FROM goal_ledger WHERE user_id = ? ORDER BY id DESC LIMIT ?',
  );

  const stored = (userId: string) => (selectWallet.get(userId) as { goals: number } | undefined)?.goals;

  const move = (userId: string, amount: number, reason: GoalReason, reference: string | null): number => {
    const current = stored(userId) ?? 0;
    if (reference !== null && selectEntry.get(userId, reason, reference)) {
      return current;
    }
    const balance = current + amount;
    if (balance < 0) {
      throw new Error('not enough goals');
    }
    updateWallet.run(balance, now(), userId);
    insertEntry.run(userId, amount, balance, reason, reference, now());
    return balance;
  };

  const open = (userId: string): number =>
    transaction(database, () => {
      const current = stored(userId);
      if (current !== undefined) {
        return current;
      }
      insertWallet.run(userId, now());
      return move(userId, WELCOME_GOALS, 'welcome', 'welcome');
    });

  return {
    balance: open,

    credit(userId: string, amount: number, reason: GoalReason, reference: string | null): number {
      return transaction(database, () => {
        open(userId);
        return move(userId, amount, reason, reference);
      });
    },

    statement(userId: string): WalletResponse {
      const goals = open(userId);
      const entries = (selectEntries.all(userId, LEDGER_LIMIT) as unknown as EntryRow[]).map(
        (row): GoalEntry => ({
          amount: row.amount,
          balance: row.balance,
          reason: row.reason as GoalReason,
          createdAt: row.created_at,
        }),
      );
      return { goals, entries };
    },
  };
}

export type Wallet = ReturnType<typeof createWallet>;
