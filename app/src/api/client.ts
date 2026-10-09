import {
  API_PREFIX,
  type AccountResponse,
  type AdStatusResponse,
  type ApiErrorCode,
  type ApiErrorResponse,
  type AuthResponse,
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
  type PointProtectionResponse,
  type ProgressResponse,
  type PurchaseRequest,
  type PurchaseResponse,
  type PushTokenRequest,
  type PuzzleGuessRequest,
  type PuzzleGuessResponse,
  type PuzzleRankingResponse,
  type RegisterRequest,
  type ResetPasswordRequest,
  type VersionResponse,
  type WalletResponse,
} from '@sportapps/protocol';

export type RequestErrorCode = ApiErrorCode | 'network' | 'unconfigured';

const TIMEOUT_MILLISECONDS = 8000;

export class ApiRequestError extends Error {
  readonly code: RequestErrorCode;

  constructor(code: RequestErrorCode) {
    super(code);
    this.name = 'ApiRequestError';
    this.code = code;
  }
}

export function errorCodeOf(error: unknown): RequestErrorCode {
  return error instanceof ApiRequestError ? error.code : 'internal';
}

interface RequestOptions {
  body?: object;
  token?: string | null;
}

export type HistoryFilter = {
  game?: GameId;
  before?: number;
  limit?: number;
};

function query(filter: { readonly [key: string]: string | number | undefined }): string {
  const entries = Object.entries(filter).filter(([, value]) => value !== undefined);
  return entries.length === 0
    ? ''
    : `?${entries.map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join('&')}`;
}

export function createApiClient(baseUrl: string | null, fetcher: typeof fetch = fetch) {
  async function request<T>(method: string, path: string, { body, token }: RequestOptions = {}): Promise<T> {
    if (!baseUrl) {
      throw new ApiRequestError('unconfigured');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MILLISECONDS);
    let response: Response;
    try {
      response = await fetcher(`${baseUrl}${API_PREFIX}${path}`, {
        method,
        signal: controller.signal,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiRequestError('network');
    } finally {
      clearTimeout(timer);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiRequestError((payload as ApiErrorResponse | null)?.error?.code ?? 'internal');
    }
    return payload as T;
  }

  return {
    configured: baseUrl !== null,
    version: () => request<VersionResponse>('GET', '/version'),
    guest: () => request<AuthResponse>('POST', '/auth/guest'),
    me: (token: string) => request<AccountResponse>('GET', '/me', { token }),
    register: (input: RegisterRequest) => request<AuthResponse>('POST', '/auth/register', { body: input }),
    login: (input: LoginRequest) => request<AuthResponse>('POST', '/auth/login', { body: input }),
    forgotPassword: (input: ForgotPasswordRequest) => request<void>('POST', '/auth/password/forgot', { body: input }),
    resetPassword: (input: ResetPasswordRequest) =>
      request<AuthResponse>('POST', '/auth/password/reset', { body: input }),
    signInWithIdentity: (provider: IdentityProvider, identity: IdentitySignInRequest) =>
      request<AuthResponse>('POST', '/auth/' + provider, { body: identity }),
    logout: (token: string) => request<void>('POST', '/auth/logout', { token }),
    deleteAccount: (token: string) => request<void>('DELETE', '/account', { token }),
    registerPushToken: (token: string, device: PushTokenRequest) =>
      request<void>('POST', '/push-token', { token, body: device }),
    chooseUsername: (token: string, username: string) =>
      request<AccountResponse>('POST', '/account/username', { token, body: { username } }),
    matches: (token: string, filter: HistoryFilter = {}) =>
      request<MatchHistoryResponse>('GET', `/matches${query(filter)}`, { token }),
    progress: (token: string) => request<ProgressResponse>('GET', '/progress', { token }),
    claimDaily: (token: string) => request<DailyRewardResponse>('POST', '/daily', { token }),
    wallet: (token: string) => request<WalletResponse>('GET', '/wallet', { token }),
    ads: (token: string) => request<AdStatusResponse>('GET', '/ads', { token }),
    pointProtection: (token: string, matchId: string) =>
      request<PointProtectionResponse>('GET', `/matches/${encodeURIComponent(matchId)}/protection`, { token }),
    purchase: (token: string, purchase: PurchaseRequest) =>
      request<PurchaseResponse>('POST', '/purchases', { token, body: purchase }),
    leaderboard: (token: string, period: LeaderboardPeriod, game: GameId | null) =>
      request<LeaderboardResponse>('GET', `/leaderboard${query({ period, game: game ?? undefined })}`, { token }),
    puzzle: (token: string, market: string) => request<DailyPuzzleResponse>('GET', `/puzzle${query({ market })}`, { token }),
    puzzleGuess: (token: string, guess: PuzzleGuessRequest) =>
      request<PuzzleGuessResponse>('POST', '/puzzle/guess', { token, body: guess }),
    puzzleRanking: (token: string, market: string) =>
      request<PuzzleRankingResponse>('GET', `/puzzle/ranking${query({ market })}`, { token }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
