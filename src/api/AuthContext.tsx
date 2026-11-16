import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, setSessionExpiredHandler, type AccountType, type ApiUser } from './client';

type AuthState =
  | { status: 'loading' }
  /** `resetToken`: se abrió el enlace de "restablecer contraseña" del correo. */
  | { status: 'anon'; reason?: string; resetToken?: string }
  | { status: 'authed'; user: ApiUser };

interface AuthContextValue {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  /** Devuelve el email registrado; la sesión empieza al confirmar el correo. */
  register: (email: string, password: string, fullName: string, accountType: AccountType) => Promise<string>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

type EmailLink = { kind: 'verify' | 'reset'; token: string };

/** Lee el enlace del correo (#verify=… o #reset=…) y lo quita de la barra de direcciones. */
function takeEmailLink(): EmailLink | null {
  const match = /^#(verify|reset)=([\w-]+)$/.exec(window.location.hash);
  if (!match) return null;
  history.replaceState(null, '', window.location.pathname + window.location.search);
  return { kind: match[1] as EmailLink['kind'], token: match[2] };
}

/**
 * Estado inicial. Se calcula una sola vez por carga de página: el token del enlace es de un solo uso
 * y el doble efecto de StrictMode lo gastaría.
 */
let boot: Promise<AuthState> | null = null;
function bootstrap(): Promise<AuthState> {
  boot ??= (async (): Promise<AuthState> => {
    const link = takeEmailLink();
    if (link?.kind === 'reset') return { status: 'anon', resetToken: link.token };
    if (link?.kind === 'verify') {
      try {
        return { status: 'authed', user: await authApi.verifyEmail(link.token) };
      } catch (err) {
        return { status: 'anon', reason: err instanceof Error ? err.message : 'No se pudo confirmar el correo.' };
      }
    }
    const user = await authApi.restore().catch(() => null);
    return user ? { status: 'authed', user } : { status: 'anon' };
  })();
  return boot;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    setSessionExpiredHandler(() => setState({ status: 'anon', reason: 'Tu sesión expiró. Inicia sesión de nuevo.' }));
    void bootstrap().then(setState);
    return () => setSessionExpiredHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState({ status: 'authed', user: await authApi.login(email, password) });
  }, []);

  const register = useCallback(
    (email: string, password: string, fullName: string, accountType: AccountType) =>
      authApi.register(email, password, fullName, accountType),
    [],
  );

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
