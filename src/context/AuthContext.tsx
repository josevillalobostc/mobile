import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authLogin, authRegister, setUnauthorizedHandler } from '../api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  initializing: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseJwt(token: string): Record<string, string> {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return {};
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Restore session from SecureStore on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          SecureStore.getItemAsync('grove_token'),
          SecureStore.getItemAsync('grove_user'),
        ]);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        }
      } catch {
        // Ignore
      } finally {
        setInitializing(false);
      }
    };
    restoreSession();
  }, []);

  // Register the unauthorized handler so api.ts can call logout
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
    });
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const res = await authLogin({ username, password });
      const payload = parseJwt(res.token);
      const userData: User = {
        id: payload.sub || payload.userId || '',
        username: payload.username || username,
        email: payload.email || '',
        role: payload.role || 'ROLE_USER',
        createdAt: new Date().toISOString(),
      };
      // SecureStore is unavailable on web – don't let it block login
      try {
        await SecureStore.setItemAsync('grove_token', res.token);
        await SecureStore.setItemAsync('grove_user', JSON.stringify(userData));
      } catch {
        // Persist failed (e.g. web) – session will work in-memory only
      }
      setToken(res.token);
      setUser(userData);
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    setLoading(true);
    try {
      await authRegister({ username, email, password });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('grove_token').catch(() => {});
    await SecureStore.deleteItemAsync('grove_user').catch(() => {});
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, initializing }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
