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
  type RegisterRequest,
  type UpdateAccountRequest,
} from '@sportapps/protocol';
import fastify, { type FastifyError, type FastifyInstance, type FastifyRequest } from 'fastify';

import type { IdentityVerifiers } from '../accounts/identity';
import { createAccountService, type AuthenticatedSession } from '../accounts/service';
import type { ServerConfig } from '../config';
import type { Database } from '../database';
import { ApiError } from './errors';
import { createRateLimiter } from './rate-limit';

const AUTH_ATTEMPTS_PER_MINUTE = 30;
const MINUTE = 60 * 1000;
const BEARER = 'Bearer ';
const TOKEN_MAX_LENGTH = 8192;
const USERNAME_INPUT_MAX_LENGTH = 64;

export interface AppDependencies {
  database: Database;
  config: ServerConfig;
  verifiers?: IdentityVerifiers;
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
const UPDATE_ACCOUNT = body({ username: text(USERNAME_INPUT_MAX_LENGTH) });

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

  const limitAttempts = (request: FastifyRequest): void => {
    if (!authAttempts.allow(request.ip)) {
      throw new ApiError('rate-limited');
    }
  };

  const replaceSession = (previous: AuthenticatedSession | null, next: AuthResponse): AuthResponse => {
    if (previous) {
      accounts.logout(previous.token);
    }
    return next;
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
    limitAttempts(request);
    return accounts.createGuest();
  });

  app.post<{ Body: RegisterRequest }>(`${API_PREFIX}/auth/register`, { schema: REGISTER }, async (request): Promise<AuthResponse> => {
    limitAttempts(request);
    const current = session(request);
    return replaceSession(current, await accounts.register(current?.user ?? null, request.body));
  });

  app.post<{ Body: LoginRequest }>(`${API_PREFIX}/auth/login`, { schema: LOGIN }, async (request): Promise<AuthResponse> => {
    limitAttempts(request);
    const current = session(request);
    return replaceSession(current, await accounts.login(request.body));
  });

  const identityRoute = (provider: IdentityProvider) =>
    app.post<{ Body: IdentitySignInRequest }>(
      `${API_PREFIX}/auth/${provider}`,
      { schema: IDENTITY },
      async (request): Promise<AuthResponse> => {
        limitAttempts(request);
        const current = session(request);
        return replaceSession(current, await accounts.signInWithIdentity(current?.user ?? null, provider, request.body.token));
      },
    );
  identityRoute('google');
  identityRoute('apple');

  app.post(`${API_PREFIX}/auth/logout`, (request, reply) => {
    accounts.logout(requireSession(request).token);
    return reply.code(204).send();
  });

  app.get(`${API_PREFIX}/me`, (request): AccountResponse => ({ account: accounts.account(requireSession(request).user) }));

  app.patch<{ Body: UpdateAccountRequest }>(
    `${API_PREFIX}/me`,
    { schema: UPDATE_ACCOUNT },
    (request): AccountResponse => ({
      account: accounts.updateUsername(requireSession(request).user, request.body.username),
    }),
  );

  return app;
}
