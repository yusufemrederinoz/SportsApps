import { useSyncExternalStore } from 'react';

import version from '@/assets/data/version.json';

export const BUNDLED_DATA_VERSION = version.dataVersion;
export const DATA_SCHEMA_VERSION = version.schemaVersion;

export interface StoredDataChoice {
  bundled: string;
  version: string;
}

let active = BUNDLED_DATA_VERSION;
const listeners = new Set<() => void>();

export function activeDataVersion(): string {
  return active;
}

export function activateDataVersion(next: string): void {
  if (next !== active) {
    active = next;
    listeners.forEach((listener) => listener());
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDataVersion(): string {
  return useSyncExternalStore(subscribe, activeDataVersion, activeDataVersion);
}

export function databaseName(dataVersion: string): string {
  return `football-${dataVersion}.db`;
}

export function startingDataVersion(
  bundled: string,
  stored: StoredDataChoice | null,
  isAvailable: (dataVersion: string) => boolean,
): string {
  if (!stored || stored.bundled !== bundled || stored.version === bundled) {
    return bundled;
  }
  return isAvailable(stored.version) ? stored.version : bundled;
}
