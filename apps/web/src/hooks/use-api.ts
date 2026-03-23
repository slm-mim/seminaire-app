'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export function useApi() {
  const { token, refreshToken } = useAuth();

  const callApi = useCallback(
    async <T>(fn: (t: string | undefined) => Promise<T>): Promise<T> => {
      try {
        return await fn(token || undefined);
      } catch (error: unknown) {
        const apiError = error as { status?: number };
        if (apiError?.status === 401) {
          const newToken = await refreshToken();
          if (newToken) {
            return await fn(newToken);
          }
        }
        throw error;
      }
    },
    [token, refreshToken],
  );

  return {
    get: <T>(path: string) => callApi<T>((t) => api.get<T>(path, { token: t })),
    post: <T>(path: string, body?: unknown) =>
      callApi<T>((t) => api.post<T>(path, body, { token: t })),
    patch: <T>(path: string, body?: unknown) =>
      callApi<T>((t) => api.patch<T>(path, body, { token: t })),
    del: <T>(path: string) => callApi<T>((t) => api.delete<T>(path, { token: t })),
  };
}
