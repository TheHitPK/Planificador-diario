import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, setSessionExpiredHandler, type ApiUser } from './client';

type AuthState = { status: 'loading' } | { status: 'anon'; reason?: string } | { status: 'authed'; user: ApiUser };

interface AuthContextValue {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    setSessionExpiredHandler(() => setState({ status: 'anon', reason: 'Tu sesión expiró. Inicia sesión de nuevo.' }));
    authApi
      .restore()
      .then((user) => setState(user ? { status: 'authed', user } : { status: 'anon' }))
      .catch(() => setState({ status: 'anon' }));
    return () => setSessionExpiredHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState({ status: 'authed', user: await authApi.login(email, password) });
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    setState({ status: 'authed', user: await authApi.register(email, password, fullName) });
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setState({ status: 'anon' });
  }, []);

  const value = useMemo(() => ({ state, login, register, logout }), [state, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
