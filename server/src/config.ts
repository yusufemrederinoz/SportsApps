import { fileURLToPath } from 'node:url';

import { DEFAULT_TIME_ZONE } from './progress/points';

export interface ServerConfig {
  host: string;
  port: number;
  databasePath: string;
  footballDatabasePath: string;
  portraitsPath: string;
  sessionDays: number;
  googleClientIds: string[];
  appleClientIds: string[];
  timeZone: string;
  trustProxy: boolean;
}

const DEFAULT_DATABASE_PATH = fileURLToPath(new URL('../data/sportapps.sqlite', import.meta.url));
const DEFAULT_FOOTBALL_DATABASE_PATH = fileURLToPath(new URL('../../app/assets/data/football.db', import.meta.url));
const DEFAULT_PORTRAITS_PATH = fileURLToPath(new URL('../../data/build/portraits', import.meta.url));

function list(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function integer(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    host: environment.HOST ?? '0.0.0.0',
    port: integer(environment.PORT, 4000),
    databasePath: environment.DATABASE_PATH ?? DEFAULT_DATABASE_PATH,
    footballDatabasePath: environment.FOOTBALL_DATABASE_PATH ?? DEFAULT_FOOTBALL_DATABASE_PATH,
    portraitsPath: environment.PORTRAITS_PATH ?? DEFAULT_PORTRAITS_PATH,
    sessionDays: integer(environment.SESSION_DAYS, 90),
    googleClientIds: list(environment.GOOGLE_CLIENT_IDS),
    appleClientIds: list(environment.APPLE_CLIENT_IDS),
    timeZone: environment.TIME_ZONE ?? DEFAULT_TIME_ZONE,
    trustProxy: environment.TRUST_PROXY === '1',
  };
}
