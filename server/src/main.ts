import { existsSync } from 'node:fs';

import { createIdentityVerifier } from './accounts/identity';
import { loadAdSettings } from './ads/setup';
import { loadConfig } from './config';
import { openDatabase } from './database';
import { openFootballLibrary, readDataVersion } from './football/library';
import { buildApp } from './http/app';
import { loadPurchaseVerifiers } from './store/setup';

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
  purchaseVerifiers: loadPurchaseVerifiers(),
  ads: loadAdSettings(),
});

if (!football) {
  app.log.warn({ path: config.footballDatabasePath }, 'football database not found, online play is disabled');
}

await app.listen({ host: config.host, port: config.port });
