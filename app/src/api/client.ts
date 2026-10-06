import {
  API_PREFIX,
  type AccountResponse,
  type ApiErrorCode,
  type ApiErrorResponse,
  type AuthResponse,
  type IdentityProvider,
  type LoginRequest,
  type RegisterRequest,
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
    guest: () => request<AuthResponse>('POST', '/auth/guest'),
    me: (token: string) => request<AccountResponse>('GET', '/me', { token }),
    register: (input: RegisterRequest) => request<AuthResponse>('POST', '/auth/register', { body: input }),
    login: (input: LoginRequest) => request<AuthResponse>('POST', '/auth/login', { body: input }),
    signInWithIdentity: (provider: IdentityProvider, identityToken: string) =>
      request<AuthResponse>('POST', '/auth/' + provider, { body: { token: identityToken } }),
    logout: (token: string) => request<void>('POST', '/auth/logout', { token }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
