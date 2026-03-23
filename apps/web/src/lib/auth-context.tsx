'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { api, ApiError } from './api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const data = await api.post<{ accessToken: string }>('/auth/refresh');
      setToken(data.accessToken);
      Cookies.set('accessToken', data.accessToken, { expires: 1 / 96 }); // 15 min
      return data.accessToken;
    } catch {
      setUser(null);
      setToken(null);
      Cookies.remove('accessToken');
      return null;
    }
  }, []);

  useEffect(() => {
    const savedToken = Cookies.get('accessToken');
    if (savedToken) {
      setToken(savedToken);
      // Decode JWT to get user info (without verification — server validates)
      try {
        const payload = JSON.parse(atob(savedToken.split('.')[1]));
        setUser({
          id: payload.sub,
          email: payload.email,
          firstName: '',
          lastName: '',
          role: payload.role,
        });
      } catch {
        // Token invalid, try refresh
        refreshToken();
      }
    } else {
      refreshToken();
    }
    setIsLoading(false);
  }, [refreshToken]);

  const login = async (email: string, password: string) => {
    const data = await api.post<{ accessToken: string; user: User }>('/auth/login', {
      email,
      password,
    });
    setUser(data.user);
    setToken(data.accessToken);
    Cookies.set('accessToken', data.accessToken, { expires: 1 / 96 });
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      setToken(null);
      Cookies.remove('accessToken');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

// Re-export ApiError so consumers don't need to import from api.ts
export { ApiError };
