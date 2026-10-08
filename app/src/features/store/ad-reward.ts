import type { AdStatusResponse } from '@sportapps/protocol';

export const AD_REWARD_CHECKS = 8;
export const AD_REWARD_CHECK_INTERVAL = 1500;

export function isRewarded(before: AdStatusResponse, current: AdStatusResponse): boolean {
  return current.remaining < before.remaining || current.goals > before.goals;
}

export async function awaitAdReward(
  fetchStatus: () => Promise<AdStatusResponse>,
  before: AdStatusResponse,
  wait: (milliseconds: number) => Promise<void>,
  checks: number = AD_REWARD_CHECKS,
): Promise<AdStatusResponse | null> {
  for (let check = 0; check < checks; check += 1) {
    await wait(AD_REWARD_CHECK_INTERVAL);
    const current = await fetchStatus().catch(() => null);
    if (current && isRewarded(before, current)) {
      return current;
    }
  }
  return null;
}

export async function awaitProtection(
  fetchProtection: () => Promise<{ points: number }>,
  wait: (milliseconds: number) => Promise<void>,
  checks: number = AD_REWARD_CHECKS,
): Promise<number> {
  for (let check = 0; check < checks; check += 1) {
    await wait(AD_REWARD_CHECK_INTERVAL);
    const current = await fetchProtection().catch(() => null);
    if (current && current.points > 0) {
      return current.points;
    }
  }
  return 0;
}

export type AdPhase = 'preparing' | 'loading' | 'ready' | 'showing' | 'crediting' | 'unavailable';

export type AdRowState = 'spent' | 'busy' | 'ready' | 'unavailable';

export function adRowState(phase: AdPhase, remaining: number | null): AdRowState {
  if (remaining === 0) {
    return 'spent';
  }
  if (phase === 'ready' && remaining !== null) {
    return 'ready';
  }
  return phase === 'unavailable' ? 'unavailable' : 'busy';
}
