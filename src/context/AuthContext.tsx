import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authLogin, authRegister, setUnauthorizedHandler, getMe } from '../api';
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

  // Refresh user data on load to ensure we have the real UUID, not just the JWT sub
  useEffect(() => {
    if (token) {
      getMe()
        .then(async (me) => {
          setUser((prev) => {
            if (!prev) return prev;
            const updated = {
              ...prev,
              id: me.id || prev.id,
              email: me.email || prev.email,
              role: me.role || prev.role,
              createdAt: me.createdAt || prev.createdAt,
            };
            SecureStore.setItemAsync('grove_user', JSON.stringify(updated)).catch(() => {});
            return updated;
          });
        })
        .catch(() => {
          // Ignore, handle unauthorized in interceptor
        });
    }
  }, [token]);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const res = await authLogin({ username, password });
      await SecureStore.setItemAsync('grove_token', res.token);
      setToken(res.token);

      const me = await getMe();

      const payload = parseJwt(res.token);
      const userData: User = {
        id: me.id || payload.userId || payload.sub || '',
        username: me.username || payload.username || username,
        email: me.email || payload.email || '',
        role: me.role || payload.role || 'ROLE_USER',
        createdAt: me.createdAt || new Date().toISOString(),
      };
      
      await SecureStore.setItemAsync('grove_user', JSON.stringify(userData));
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
