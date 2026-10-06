import { createIdentityVerifier } from './accounts/identity';
import { loadConfig } from './config';
import { openDatabase } from './database';
import { buildApp } from './http/app';

const config = loadConfig();
const database = openDatabase(config.databasePath);
const app = buildApp({
  database,
  config,
  logger: true,
  verifiers: {
    google: createIdentityVerifier('google', config.googleClientIds),
    apple: createIdentityVerifier('apple', config.appleClientIds),
  },
});

await app.listen({ host: config.host, port: config.port });
