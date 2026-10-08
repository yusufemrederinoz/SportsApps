import { existsSync } from 'node:fs';

import { loadAppleTokens } from './accounts/apple-tokens';
import { createIdentityVerifier } from './accounts/identity';
import { loadAdminKey } from './admin/access';
import { loadAdSettings } from './ads/setup';
import { loadConfig } from './config';
import { openDatabase } from './database';
import { openFootballLibrary, readDataVersion } from './football/library';
import { buildApp } from './http/app';
import { loadMailer } from './mail/setup';
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
  appleTokens: loadAppleTokens(),
  purchaseVerifiers: loadPurchaseVerifiers(),
  ads: loadAdSettings(),
  mailer: loadMailer(),
  adminKey: loadAdminKey(),
});

if (!football) {
  app.log.warn({ path: config.footballDatabasePath }, 'football database not found, online play is disabled');
}

await app.listen({ host: config.host, port: config.port });
