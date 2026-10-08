import { goalPack, type PurchaseRequest, type PurchaseResponse } from '@sportapps/protocol';

import type { UserRow } from '../accounts/repository';
import { transaction, type Database } from '../database';
import { ApiError } from '../http/errors';
import type { Progress } from '../progress/store';
import { StoreUnreachableError, type PurchaseVerifiers, type VerifiedPurchase } from './verifiers';

export function createStore(
  database: Database,
  progress: Progress,
  verifiers: PurchaseVerifiers,
  now: () => number = Date.now,
  onRejected: (error: unknown) => void = () => undefined,
) {
  const selectPurchase = database.prepare('SELECT user_id FROM purchases WHERE platform = ? AND transaction_id = ?');
  const insertPurchase = database.prepare(
    'INSERT INTO purchases (platform, transaction_id, user_id, product_id, goals, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  );

  return {
    async purchase(user: UserRow, request: PurchaseRequest): Promise<PurchaseResponse> {
      if (user.is_guest === 1) {
        throw new ApiError('guest-purchase');
      }
      const pack = goalPack(request.productId);
      if (!pack) {
        throw new ApiError('purchase-invalid');
      }
      const verify = verifiers[request.platform];
      if (!verify) {
        throw new ApiError('store-unavailable');
      }
      let verified: VerifiedPurchase;
      try {
        verified = await verify(pack.productId, request.proof);
      } catch (error) {
        onRejected(error);
        throw new ApiError(error instanceof StoreUnreachableError ? 'store-unavailable' : 'purchase-invalid');
      }

      return transaction(database, () => {
        const existing = selectPurchase.get(request.platform, verified.transactionId) as
          | { user_id: string | null }
          | undefined;
        if (existing) {
          if (existing.user_id !== user.id) {
            throw new ApiError('purchase-used');
          }
          return { granted: 0, goals: progress.goalsOf(user.id) };
        }
        insertPurchase.run(request.platform, verified.transactionId, user.id, pack.productId, pack.goals, now());
        const reference = `${request.platform}:${verified.transactionId}`;
        return { granted: pack.goals, goals: progress.creditGoals(user.id, pack.goals, 'purchase', reference) };
      });
    },
  };
}

export type Store = ReturnType<typeof createStore>;
