import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

import {
  API_PREFIX,
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  type AccountResponse,
  type ApiErrorResponse,
  type AuthResponse,
  type IdentityProvider,
  type IdentitySignInRequest,
  type LoginRequest,
  type MatchHistoryResponse,
  type RegisterRequest,
} from '@sportapps/protocol';
import fastify, { type FastifyError, type FastifyInstance, type FastifyRequest } from 'fastify';

import type { IdentityVerifiers } from '../accounts/identity';
import { createAccountService, type AuthenticatedSession } from '../accounts/service';
import type { ServerConfig } from '../config';
import type { Database } from '../database';
import type { FootballLibrary } from '../football/library';
import { registerPlayGateway } from '../play/gateway';
import { createMatchHistory } from '../play/history';
import { createLobby, type LobbyOptions } from '../play/lobby';
import { ApiError } from './errors';
import { createRateLimiter } from './rate-limit';

const AUTH_ATTEMPTS_PER_MINUTE = 30;
const MINUTE = 60 * 1000;
const BEARER = 'Bearer ';
const TOKEN_MAX_LENGTH = 8192;
const USERNAME_INPUT_MAX_LENGTH = 64;
const HISTORY_PAGE_SIZE = 30;
const PORTRAIT_FILE = /^\d{1,12}\.webp$/;
const PORTRAIT_CACHE_SECONDS = 7 * 24 * 60 * 60;

export interface AppDependencies {
  database: Database;
  config: ServerConfig;
  verifiers?: IdentityVerifiers;
  football?: FootballLibrary;
  play?: Partial<Omit<LobbyOptions, 'library' | 'history'>>;
  now?: () => number;
  logger?: boolean;
}

const text = (maxLength: number) => ({ type: 'string', minLength: 1, maxLength }) as const;

function body(properties: Record<string, ReturnType<typeof text>>) {
  return {
    body: { type: 'object', additionalProperties: false, required: Object.keys(properties), properties },
  } as const;
}

const REGISTER = body({
  email: text(EMAIL_MAX_LENGTH),
  password: text(PASSWORD_MAX_LENGTH),
  username: text(USERNAME_INPUT_MAX_LENGTH),
});
const LOGIN = body({ email: text(EMAIL_MAX_LENGTH), password: text(PASSWORD_MAX_LENGTH) });
const IDENTITY = body({ token: text(TOKEN_MAX_LENGTH) });

function errorBody(error: ApiError): ApiErrorResponse {
  return { error: { code: error.code } };
}

export function buildApp(dependencies: AppDependencies): FastifyInstance {
  const { database, config } = dependencies;
  const now = dependencies.now ?? Date.now;
  const app = fastify({ logger: dependencies.logger ?? false });
  const accounts = createAccountService(database, {
    sessionDays: config.sessionDays,
    verifiers: dependencies.verifiers,
    now,
  });
  const authAttempts = createRateLimiter(AUTH_ATTEMPTS_PER_MINUTE, MINUTE, now);
  const history = createMatchHistory(database);

  if (dependencies.football) {
    const lobby = createLobby({
      now,
      isUsernameTaken: accounts.isUsernameTaken,
      onError: (error) => app.log.error(error),
      ...dependencies.play,
      library: dependencies.football,
      history,
    });
    registerPlayGateway(app, { accounts, lobby, dataVersion: dependencies.football.dataVersion, now });
    app.addHook('onClose', () => lobby.shutdown());
  }

  const session = (request: FastifyRequest): AuthenticatedSession | null => {
    const header = request.headers.authorization;
    return header?.startsWith(BEARER) ? accounts.authenticate(header.slice(BEARER.length)) : null;
  };

  const requireSession = (request: FastifyRequest): AuthenticatedSession => {
    const current = session(request);
    if (!current) {
      throw new ApiError('unauthorized');
    }
    return current;
  };

  const startSignIn = (request: FastifyRequest): void => {
    if (!authAttempts.allow(request.ip)) {
      throw new ApiError('rate-limited');
    }
    if (session(request)) {
      throw new ApiError('already-signed-in');
    }
  };

  app.setErrorHandler((error: FastifyError | ApiError, request, reply) => {
    if (error instanceof ApiError) {
      return reply.code(error.statusCode).send(errorBody(error));
    }
    if ('validation' in error && error.validation) {
      return reply.code(400).send(errorBody(new ApiError('validation')));
    }
    request.log.error(error);
    return reply.code(500).send(errorBody(new ApiError('internal')));
  });

  app.setNotFoundHandler((_, reply) => reply.code(404).send(errorBody(new ApiError('not-found'))));

  app.get(`${API_PREFIX}/health`, () => ({ status: 'ok' }));

  app.post(`${API_PREFIX}/auth/guest`, (request): AuthResponse => {
    startSignIn(request);
    return accounts.createGuest();
  });

  app.post<{ Body: RegisterRequest }>(`${API_PREFIX}/auth/register`, { schema: REGISTER }, (request): Promise<AuthResponse> => {
    startSignIn(request);
    return accounts.register(request.body);
  });

  app.post<{ Body: LoginRequest }>(`${API_PREFIX}/auth/login`, { schema: LOGIN }, (request): Promise<AuthResponse> => {
    startSignIn(request);
    return accounts.login(request.body);
  });

  const identityRoute = (provider: IdentityProvider) =>
    app.post<{ Body: IdentitySignInRequest }>(
      `${API_PREFIX}/auth/${provider}`,
      { schema: IDENTITY },
      (request): Promise<AuthResponse> => {
        startSignIn(request);
        return accounts.signInWithIdentity(provider, request.body.token);
      },
    );
  identityRoute('google');
  identityRoute('apple');

  app.post(`${API_PREFIX}/auth/logout`, (request, reply) => {
    accounts.logout(requireSession(request).token);
    return reply.code(204).send();
  });

  app.get(`${API_PREFIX}/me`, (request): AccountResponse => ({ account: accounts.account(requireSession(request).user) }));

  app.get<{ Params: { file: string } }>(`${API_PREFIX}/portraits/:file`, async (request, reply) => {
    const { file } = request.params;
    if (!PORTRAIT_FILE.test(file)) {
      throw new ApiError('not-found');
    }
    const path = join(config.portraitsPath, file);
    const details = await stat(path).catch(() => null);
    if (!details?.isFile()) {
      throw new ApiError('not-found');
    }
    return reply
      .header('Content-Type', 'image/webp')
      .header('Content-Length', details.size)
      .header('Cache-Control', `public, max-age=${PORTRAIT_CACHE_SECONDS}, immutable`)
      .send(createReadStream(path));
  });

  app.get(
    `${API_PREFIX}/matches`,
    (request): MatchHistoryResponse => ({ matches: history.list(requireSession(request).user.id, HISTORY_PAGE_SIZE) }),
  );

  return app;
}
