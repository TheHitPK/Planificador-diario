/**
 * Cliente HTTP de la API.
 * - El access token (15 min) vive solo en memoria.
 * - El refresh token se guarda en localStorage para mantener la sesión al recargar.
 *   (Compromiso aceptable para una app personal; una cookie httpOnly sería más segura frente a XSS.)
 * - Si una petición devuelve 401, se renueva la sesión una vez y se reintenta.
 */

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8080/api';
const REFRESH_KEY = 'pd.auth.refresh';

/** Una cuenta de empresa solo usa planificación, disciplinas y pendientes. */
export type AccountType = 'PERSONAL' | 'BUSINESS';

export interface ApiUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  accountType: AccountType;
  createdAt: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: ApiUser;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string>,
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;
let onSessionExpired: (() => void) | null = null;

export const setSessionExpiredHandler = (fn: (() => void) | null) => {
  onSessionExpired = fn;
};

const readRefresh = () => {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
};

function saveSession(res: AuthResponse) {
  accessToken = res.accessToken;
  try {
    localStorage.setItem(REFRESH_KEY, res.refreshToken);
  } catch {
    /* storage bloqueado: la sesión durará solo mientras la pestaña esté abierta */
  }
}

function clearSession() {
  accessToken = null;
  try {
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* nada que limpiar */
  }
}

async function send(method: string, path: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  try {
    return await fetch(BASE_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. ¿Está encendido el backend?');
  }
}

/** Convierte una respuesta problem+json en un error con mensaje legible. */
async function toError(res: Response): Promise<ApiError> {
  try {
    const p = (await res.json()) as { detail?: string; errors?: Record<string, string> };
    const first = p.errors ? Object.entries(p.errors)[0] : undefined;
    const message = first ? `${p.detail ?? 'Datos inválidos'}: ${first[0]} ${first[1]}` : p.detail;
    return new ApiError(res.status, message ?? `Error ${res.status}`, p.errors);
  } catch {
    return new ApiError(res.status, `Error ${res.status}`);
  }
}

/** Renueva la sesión con el refresh token. Varias peticiones simultáneas comparten el mismo intento. */
export function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const token = readRefresh();
      if (!token) return false;
      const res = await send('POST', '/auth/refresh', { refreshToken: token });
      if (!res.ok) {
        clearSession();
        return false;
      }
      saveSession((await res.json()) as AuthResponse);
      return true;
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res = await send(method, path, body);
  if (res.status === 401 && !path.startsWith('/auth/') && readRefresh()) {
    if (await refreshSession()) res = await send(method, path, body);
  }
  if (res.status === 401 && !path.startsWith('/auth/')) {
    clearSession();
    onSessionExpired?.();
    throw new ApiError(401, 'Tu sesión expiró. Inicia sesión de nuevo.');
  }
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Descarga un archivo generado por la API (con la sesión actual). */
export async function download(path: string): Promise<Blob> {
  let res = await send('GET', path);
  if (res.status === 401 && readRefresh() && (await refreshSession())) res = await send('GET', path);
  if (res.status === 401) {
    clearSession();
    onSessionExpired?.();
    throw new ApiError(401, 'Tu sesión expiró. Inicia sesión de nuevo.');
  }
  if (!res.ok) throw await toError(res);
  return res.blob();
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: (path: string) => request<void>('DELETE', path),
};

export const authApi = {
  async login(email: string, password: string): Promise<ApiUser> {
    const res = await request<AuthResponse>('POST', '/auth/login', { email, password });
    saveSession(res);
    return res.user;
  },

  async register(email: string, password: string, fullName: string, accountType: AccountType): Promise<ApiUser> {
    const res = await request<AuthResponse>('POST', '/auth/register', { email, password, fullName, accountType });
    saveSession(res);
    return res.user;
  },

  /** Recupera la sesión al recargar la página, si hay refresh token guardado. */
  async restore(): Promise<ApiUser | null> {
    if (!readRefresh() || !(await refreshSession())) return null;
    return api.get<ApiUser>('/users/me');
  },

  async logout(): Promise<void> {
    const token = readRefresh();
    clearSession();
    if (token) await send('POST', '/auth/logout', { refreshToken: token }).catch(() => undefined);
  },
};
