import { getApiBaseUrl } from './api-base';

const TOKEN_KEY = 'acousticsfx-admin-token';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export { getApiBaseUrl } from './api-base';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function request<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = path.startsWith('http') ? path : `${getApiBaseUrl()}${path}`;
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const raw = (body as { error?: unknown }).error ?? res.statusText;
    const message = typeof raw === 'string' ? raw : res.statusText;
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
