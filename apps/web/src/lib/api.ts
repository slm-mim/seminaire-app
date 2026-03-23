const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface FetchOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const { token, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...fetchOptions,
      headers,
      credentials: 'include', // for httpOnly cookies (refresh token)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erreur réseau' }));
      throw new ApiError(response.status, error.message || 'Erreur serveur');
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  }

  get<T>(path: string, options?: FetchOptions) {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T>(path: string, body?: unknown, options?: FetchOptions) {
    return this.request<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) });
  }

  patch<T>(path: string, body?: unknown, options?: FetchOptions) {
    return this.request<T>(path, { ...options, method: 'PATCH', body: JSON.stringify(body) });
  }

  delete<T>(path: string, options?: FetchOptions) {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = new ApiClient(API_URL);
