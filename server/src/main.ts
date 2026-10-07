import { existsSync } from 'node:fs';

import { createIdentityVerifier } from './accounts/identity';
import { loadConfig } from './config';
import { openDatabase } from './database';
import { openFootballLibrary, readDataVersion } from './football/library';
import { buildApp } from './http/app';

const config = loadConfig();
const database = openDatabase(config.databasePath);
const football = existsSync(config.footballDatabasePath)
  ? openFootballLibrary(config.footballDatabasePath, readDataVersion(config.footballDatabasePath))
  : undefined;
const app = buildApp({
  database,
  config,
  football,
  logger: true,
  verifiers: {
    google: createIdentityVerifier('google', config.googleClientIds),
    apple: createIdentityVerifier('apple', config.appleClientIds),
  },
});

if (!football) {
  app.log.warn({ path: config.footballDatabasePath }, 'football database not found, online play is disabled');
}

await app.listen({ host: config.host, port: config.port });
