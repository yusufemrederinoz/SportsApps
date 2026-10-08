import { createReadStream, readFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

import {
  ACTIVE_GAME_IDS,
  API_PREFIX,
  EMAIL_MAX_LENGTH,
  GAME_IDS,
  PASSWORD_MAX_LENGTH,
  PUSH_PLATFORMS,
  RESET_CODE_LENGTH,
  type AccountResponse,
  type AdStatusResponse,
  type ApiErrorResponse,
  type AuthResponse,
  type ChooseUsernameRequest,
  type DailyPuzzleResponse,
  type DailyRewardResponse,
  type ForgotPasswordRequest,
  type GameId,
  type IdentityProvider,
  type IdentitySignInRequest,
  type LeaderboardPeriod,
  type LeaderboardResponse,
  type LoginRequest,
  type MatchHistoryResponse,
  type ProgressResponse,
  type PurchaseRequest,
  type PurchaseResponse,
  type PushTokenRequest,
  type PuzzleGuessRequest,
  type PuzzleGuessResponse,
  type PuzzleRankingResponse,
  type RegisterRequest,
  type ResetPasswordRequest,
  type WalletResponse,
} from '@sportapps/protocol';
import fastify, { type FastifyError, type FastifyInstance, type FastifyRequest } from 'fastify';

import type { IdentityVerifiers } from '../accounts/identity';
import { createAccountService, type AuthenticatedSession } from '../accounts/service';
import { createPresence, isAdminKey } from '../admin/access';
import { NO_LIVE_PLAY, createAdminStats, type AdminStats, type LiveSnapshot } from '../admin/stats';
import { createAds, type AdRewardOutcome, type AdSettings } from '../ads/service';
import type { ServerConfig } from '../config';
import type { Database } from '../database';
import type { FootballLibrary } from '../football/library';
import { DEFAULT_AUCTION_TIMING, createAuctionRoomFactory, type AuctionTiming } from '../play/auction-room';
import { DEFAULT_BOT_TIMING, type BotTiming } from '../play/bot';
import { DEFAULT_CAREER_TIMING, createCareerRoomFactory, type CareerTiming } from '../play/career-room';
import { DEFAULT_CHAIN_TIMING, createChainRoomFactory, type ChainTiming } from '../play/chain-room';
import { DEFAULT_DRAFT_TIMING, createDraftRoomFactory, type DraftTiming } from '../play/draft-room';
import { DEFAULT_DUEL_TIMING, createDuelRoomFactory, type DuelTiming } from '../play/duel-room';
import { registerPlayGateway } from '../play/gateway';
import { createGridRoomFactory } from '../play/grid-room';
import { DEFAULT_HIGHER_TIMING, createHigherRoomFactory, type HigherTiming } from '../play/higher-room';
import { createMatchHistory } from '../play/history';
import type { Mailer } from '../mail/mailer';
import { createExpoSender, type PushSender } from '../notifications/sender';
import { createNotifications } from '../notifications/service';
import type { RoomFactory } from '../play/live-room';
import { createLobby, type LobbyOptions } from '../play/lobby';
import { DEFAULT_RARE_TIMING, createRareRoomFactory, type RareTiming } from '../play/rare-room';
import { DEFAULT_TOP_TEN_TIMING, createTopTenRoomFactory, type TopTenTiming } from '../play/top-ten-room';
import { createLeaderboard } from '../progress/leaderboard';
import { PuzzleError, createPuzzles, type Puzzles } from '../progress/puzzle';
import { createProgress } from '../progress/store';
import { createStore } from '../store/service';
import type { PurchaseVerifiers } from '../store/verifiers';
import { ApiError } from './errors';
import { createRateLimiter } from './rate-limit';

const AUTH_ATTEMPTS_PER_MINUTE = 30;
const ADMIN_FAILURES_PER_MINUTE = 10;
const ADMIN_PANEL = readFileSync(new URL('../admin/panel.html', import.meta.url), 'utf8');
const ADMIN_PANEL_POLICY = "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'";
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
  sendPush?: PushSender;
  adminKey?: string;
  mailer?: Mailer;
  purchaseVerifiers?: PurchaseVerifiers;
  ads?: AdSettings;
  play?: Partial<Omit<LobbyOptions, 'games' | 'hasMarket' | 'history'>> & {
    botTiming?: BotTiming;
    duelTiming?: Partial<DuelTiming>;
    draftTiming?: Partial<DraftTiming>;
    higherTiming?: Partial<HigherTiming>;
    chainTiming?: Partial<ChainTiming>;
    rareTiming?: Partial<RareTiming>;
    auctionTiming?: Partial<AuctionTiming>;
    topTenTiming?: Partial<TopTenTiming>;
    careerTiming?: Partial<CareerTiming>;
  };
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
const USERNAME = body({ username: text(USERNAME_INPUT_MAX_LENGTH) });
const PUSH_TOKEN_MAX_LENGTH = 200;
const LANGUAGE_MAX_LENGTH = 16;
const PUSH_TOKEN = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['token', 'platform', 'language'],
    properties: {
      token: text(PUSH_TOKEN_MAX_LENGTH),
      platform: { type: 'string', enum: [...PUSH_PLATFORMS] },
      language: text(LANGUAGE_MAX_LENGTH),
    },
  },
} as const;
const PUSH_TOKEN_REMOVAL = body({ token: text(PUSH_TOKEN_MAX_LENGTH) });
const FORGOT_PASSWORD = body({ email: text(EMAIL_MAX_LENGTH), language: text(LANGUAGE_MAX_LENGTH) });
const RESET_PASSWORD = body({
  email: text(EMAIL_MAX_LENGTH),
  code: text(RESET_CODE_LENGTH),
  password: text(PASSWORD_MAX_LENGTH),
});
const PRODUCT_ID_MAX_LENGTH = 64;
const PURCHASE_PROOF_MAX_LENGTH = 4096;
const PURCHASE = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['platform', 'productId', 'proof'],
    properties: {
      platform: { type: 'string', enum: [...PUSH_PLATFORMS] },
      productId: text(PRODUCT_ID_MAX_LENGTH),
      proof: text(PURCHASE_PROOF_MAX_LENGTH),
    },
  },
} as const;
const MARKET_MAX_LENGTH = 8;
const LEADERBOARD_QUERY = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      period: { type: 'string', enum: ['week', 'all'] },
      game: { type: 'string', enum: [...ACTIVE_GAME_IDS] },
    },
  },
} as const;
const MARKET_QUERY = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    required: ['market'],
    properties: { market: { type: 'string', minLength: 1, maxLength: MARKET_MAX_LENGTH } },
  },
} as const;
const PUZZLE_GUESS = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['market', 'cell', 'footballerId'],
    properties: {
      market: { type: 'string', minLength: 1, maxLength: MARKET_MAX_LENGTH },
      cell: {
        type: 'object',
        additionalProperties: false,
        required: ['row', 'column'],
        properties: { row: { type: 'integer' }, column: { type: 'integer' } },
      },
      footballerId: { type: 'integer', minimum: 1 },
    },
  },
} as const;
const HISTORY_QUERY = {
  querystring: {
    type: 'object',
    additionalProperties: false,
    properties: {
      game: { type: 'string', enum: [...GAME_IDS] },
      before: { type: 'integer', minimum: 0 },
      limit: { type: 'integer', minimum: 1, maximum: HISTORY_PAGE_SIZE },
    },
  },
} as const;

const NO_ADS: AdSettings = { units: [], verify: async () => false };
const AD_REWARD_STATUS_CODES: Partial<Record<AdRewardOutcome, number>> = { forged: 400 };

function errorBody(error: ApiError): ApiErrorResponse {
  return { error: { code: error.code } };
}

export function buildApp(dependencies: AppDependencies): FastifyInstance {
  const { database, config } = dependencies;
  const now = dependencies.now ?? Date.now;
  const app = fastify({ logger: dependencies.logger ?? false, trustProxy: config.trustProxy });
  const accounts = createAccountService(database, {
    sessionDays: config.sessionDays,
    verifiers: dependencies.verifiers,
    mailer: dependencies.mailer,
    onMailError: (error) => app.log.error(error),
    now,
  });
  const authAttempts = createRateLimiter(AUTH_ATTEMPTS_PER_MINUTE, MINUTE, now);
  const adminFailures = createRateLimiter(ADMIN_FAILURES_PER_MINUTE, MINUTE, now);
  const presence = createPresence(now);
  const history = createMatchHistory(database);
  const progress = createProgress(database, { now, timeZone: config.timeZone });
  const leaderboard = createLeaderboard(database, { now, timeZone: config.timeZone });
  const ads = createAds(database, progress, dependencies.ads ?? NO_ADS, { now, timeZone: config.timeZone });
  const store = createStore(database, progress, dependencies.purchaseVerifiers ?? {}, now, (error) => app.log.warn(error));
  const notifications = createNotifications(database, {
    now,
    timeZone: config.timeZone,
    send: dependencies.sendPush ?? createExpoSender(),
    onError: (error) => app.log.error(error),
  });
  if (config.notifications) {
    app.addHook('onClose', notifications.start());
  }
  let puzzles: Puzzles | null = null;
  let evict: (userId: string) => void = () => undefined;
  let livePlay: () => LiveSnapshot = () => NO_LIVE_PLAY;
  let hasMarket: (market: string) => boolean = () => false;

  if (dependencies.football) {
    const { football } = dependencies;
    const {
      botTiming,
      duelTiming,
      draftTiming,
      higherTiming,
      chainTiming,
      rareTiming,
      auctionTiming,
      topTenTiming,
      careerTiming,
      ...lobbyOptions
    } = dependencies.play ?? {};
    const factories: Record<GameId, RoomFactory> = {
      grid: createGridRoomFactory(football, botTiming ?? DEFAULT_BOT_TIMING),
      duel: createDuelRoomFactory(football, { ...DEFAULT_DUEL_TIMING, ...duelTiming }),
      draft: createDraftRoomFactory(football, { ...DEFAULT_DRAFT_TIMING, ...draftTiming }),
      higher: createHigherRoomFactory(football, { ...DEFAULT_HIGHER_TIMING, ...higherTiming }),
      chain: createChainRoomFactory(football, { ...DEFAULT_CHAIN_TIMING, ...chainTiming }),
      rare: createRareRoomFactory(football, { ...DEFAULT_RARE_TIMING, ...rareTiming }),
      auction: createAuctionRoomFactory(football, { ...DEFAULT_AUCTION_TIMING, ...auctionTiming }),
      'top-ten': createTopTenRoomFactory(football, { ...DEFAULT_TOP_TEN_TIMING, ...topTenTiming }),
      career: createCareerRoomFactory(football, { ...DEFAULT_CAREER_TIMING, ...careerTiming }),
    };
    const lobby = createLobby({
      now,
      isUsernameTaken: accounts.isUsernameTaken,
      onError: (error) => app.log.error(error),
      ...lobbyOptions,
      games: Object.fromEntries(ACTIVE_GAME_IDS.map((game) => [game, factories[game]])),
      hasMarket: football.hasMarket,
      history,
      progress,
    });
    registerPlayGateway(app, { accounts, lobby, dataVersion: football.dataVersion, now });
    puzzles = createPuzzles(database, football, progress, { now, timeZone: config.timeZone });
    hasMarket = football.hasMarket;
    evict = lobby.evict;
    livePlay = lobby.snapshot;
    app.addHook('onClose', () => lobby.shutdown());
  }

  const adminStats = createAdminStats(database, {
    now,
    timeZone: config.timeZone,
    live: () => livePlay(),
    online: presence.count,
    startedAt: now(),
  });

  const session = (request: FastifyRequest): AuthenticatedSession | null => {
    const header = request.headers.authorization;
    const current = header?.startsWith(BEARER) ? accounts.authenticate(header.slice(BEARER.length)) : null;
    if (current) {
      presence.touch(current.user.id);
    }
    return current;
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

  app.get('/admin', (_, reply) => {
    if (!dependencies.adminKey) {
      throw new ApiError('not-found');
    }
    return reply
      .header('Content-Type', 'text/html; charset=utf-8')
      .header('Cache-Control', 'no-store')
      .header('X-Robots-Tag', 'noindex, nofollow')
      .header('Content-Security-Policy', ADMIN_PANEL_POLICY)
      .send(ADMIN_PANEL);
  });

  app.get(`${API_PREFIX}/admin/stats`, (request, reply): AdminStats => {
    const { adminKey } = dependencies;
    if (!adminKey) {
      throw new ApiError('not-found');
    }
    const header = request.headers.authorization;
    if (!header?.startsWith(BEARER) || !isAdminKey(header.slice(BEARER.length), adminKey)) {
      throw new ApiError(adminFailures.allow(request.ip) ? 'unauthorized' : 'rate-limited');
    }
    void reply.header('Cache-Control', 'no-store');
    return adminStats.read();
  });

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

  app.post<{ Body: ForgotPasswordRequest }>(
    `${API_PREFIX}/auth/password/forgot`,
    { schema: FORGOT_PASSWORD },
    (request, reply) => {
      startSignIn(request);
      accounts.requestPasswordReset(request.body);
      return reply.code(204).send();
    },
  );

  app.post<{ Body: ResetPasswordRequest }>(
    `${API_PREFIX}/auth/password/reset`,
    { schema: RESET_PASSWORD },
    (request): Promise<AuthResponse> => {
      startSignIn(request);
      return accounts.resetPassword(request.body);
    },
  );

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

  app.post<{ Body: ChooseUsernameRequest }>(
    `${API_PREFIX}/account/username`,
    { schema: USERNAME },
    (request): AccountResponse => ({ account: accounts.chooseUsername(requireSession(request).user, request.body.username) }),
  );

  app.post<{ Body: PurchaseRequest }>(
    `${API_PREFIX}/purchases`,
    { schema: PURCHASE },
    (request): Promise<PurchaseResponse> => store.purchase(requireSession(request).user, request.body),
  );

  app.post<{ Body: PushTokenRequest }>(`${API_PREFIX}/push-token`, { schema: PUSH_TOKEN }, (request, reply) => {
    const { token, platform, language } = request.body;
    notifications.register(requireSession(request).user.id, token, platform, language);
    return reply.code(204).send();
  });

  app.delete<{ Body: { token: string } }>(`${API_PREFIX}/push-token`, { schema: PUSH_TOKEN_REMOVAL }, (request, reply) => {
    notifications.unregister(requireSession(request).user.id, request.body.token);
    return reply.code(204).send();
  });

  app.delete(`${API_PREFIX}/account`, (request, reply) => {
    const { user } = requireSession(request);
    evict(user.id);
    accounts.deleteAccount(user.id);
    return reply.code(204).send();
  });

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

  app.get<{ Querystring: { game?: GameId; before?: number; limit?: number } }>(
    `${API_PREFIX}/matches`,
    { schema: HISTORY_QUERY },
    (request): MatchHistoryResponse => {
      const { game, before, limit = HISTORY_PAGE_SIZE } = request.query;
      const matches = history.list(requireSession(request).user.id, { game, before, limit: limit + 1 });
      return { matches: matches.slice(0, limit), more: matches.length > limit };
    },
  );

  app.get(`${API_PREFIX}/progress`, (request): ProgressResponse => ({
    progress: progress.progress(requireSession(request).user.id),
  }));

  app.post(`${API_PREFIX}/daily`, (request): DailyRewardResponse => progress.claimDaily(requireSession(request).user.id));

  app.get(`${API_PREFIX}/wallet`, (request): WalletResponse => progress.wallet(requireSession(request).user.id));

  app.get(`${API_PREFIX}/ads`, (request): AdStatusResponse => ads.status(requireSession(request).user.id));

  app.get(`${API_PREFIX}/ads/reward`, async (request, reply) => {
    const outcome = await ads.reward(request.raw.url?.split('?')[1] ?? '');
    request.log.info({ outcome }, 'ad reward callback');
    return reply.code(AD_REWARD_STATUS_CODES[outcome] ?? 200).send();
  });

  app.get<{ Querystring: { period?: LeaderboardPeriod; game?: GameId } }>(
    `${API_PREFIX}/leaderboard`,
    { schema: LEADERBOARD_QUERY },
    (request): LeaderboardResponse =>
      leaderboard.board(requireSession(request).user.id, request.query.period ?? 'week', request.query.game ?? null),
  );

  const puzzleWork = <T>(market: string, work: (available: Puzzles) => T): T => {
    if (!puzzles || !hasMarket(market)) {
      throw new ApiError('puzzle-unavailable');
    }
    try {
      return work(puzzles);
    } catch (error) {
      if (error instanceof PuzzleError) {
        throw new ApiError(
          error.code === 'finished'
            ? 'puzzle-finished'
            : error.code === 'cell-taken'
              ? 'cell-taken'
              : error.code === 'no-puzzle'
                ? 'puzzle-unavailable'
                : 'validation',
        );
      }
      throw error;
    }
  };

  app.get<{ Querystring: { market: string } }>(
    `${API_PREFIX}/puzzle`,
    { schema: MARKET_QUERY },
    (request): DailyPuzzleResponse => {
      const userId = requireSession(request).user.id;
      return { puzzle: puzzleWork(request.query.market, (available) => available.puzzle(userId, request.query.market)) };
    },
  );

  app.post<{ Body: PuzzleGuessRequest }>(`${API_PREFIX}/puzzle/guess`, { schema: PUZZLE_GUESS }, (request): PuzzleGuessResponse => {
    const userId = requireSession(request).user.id;
    const { market, cell, footballerId } = request.body;
    return puzzleWork(market, (available) => available.guess(userId, market, cell, footballerId));
  });

  app.get<{ Querystring: { market: string } }>(
    `${API_PREFIX}/puzzle/ranking`,
    { schema: MARKET_QUERY },
    (request): PuzzleRankingResponse => {
      const userId = requireSession(request).user.id;
      return puzzleWork(request.query.market, (available) => available.ranking(userId, request.query.market));
    },
  );

  return app;
}
