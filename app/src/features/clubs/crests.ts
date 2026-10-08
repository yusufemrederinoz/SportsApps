import crests from '@/assets/data/club-crests.json';

import type { ClubCrest } from './crest-svg';

const CRESTS = crests as unknown as Readonly<Record<string, ClubCrest>>;

export const CREST_COUNT = Object.keys(CRESTS).length;

export function crestOf(clubId: number): ClubCrest | null {
  return CRESTS[String(clubId)] ?? null;
}

export function allCrests(): readonly ClubCrest[] {
  return Object.values(CRESTS);
}
