'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import Cookies from 'js-cookie';
import { decodeJwtPayload } from '@/modules/auth/util/jwt.util';

const AUTH_TOKEN_COOKIE = 'auth_token';
const AUTH_TOKEN_EXPIRES_DAYS = 7;

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  status: AuthStatus;
};

type AuthContextValue = AuthState & {
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const INITIAL_STATE: AuthState = { user: null, token: null, status: 'loading' };

function readSessionFromCookie(): { user: AuthUser; token: string } | null {
  const token = Cookies.get(AUTH_TOKEN_COOKIE);
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  return {
    token,
    user: { id: payload.sub, name: payload.name, email: payload.email },
  };
}

/**
 * Hidrata a sessão a partir do cookie.
 *
 * O estado inicial (`INITIAL_STATE`, status `loading`) é idêntico no servidor e no
 * primeiro render do client — nenhum acesso a `document`/`localStorage`/cookie
 * acontece durante o render. A leitura do cookie só ocorre dentro de um
 * `useEffect`, que roda depois da hidratação, então o React nunca precisa
 * reconciliar uma árvore diferente da que o servidor enviou.
 */
function hydrateStateOnce(previous: AuthState): AuthState {
  if (previous.status !== 'loading') return previous;

  const session = readSessionFromCookie();

  if (session) {
    return { user: session.user, token: session.token, status: 'authenticated' };
  }

  Cookies.remove(AUTH_TOKEN_COOKIE);
  return { user: null, token: null, status: 'unauthenticated' };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);

  useEffect(() => {
    // Hidratação client-only inevitável: o cookie de sessão não existe no
    // servidor, então o estado real só pode ser lido depois do mount (aqui).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((previous) => hydrateStateOnce(previous));
  }, []);

  const login = useCallback((newToken: string) => {
    const payload = decodeJwtPayload(newToken);
    if (!payload) return;

    Cookies.set(AUTH_TOKEN_COOKIE, newToken, {
      expires: AUTH_TOKEN_EXPIRES_DAYS,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    setState({
      user: { id: payload.sub, name: payload.name, email: payload.email },
      token: newToken,
      status: 'authenticated',
    });
  }, []);

  const logout = useCallback(() => {
    Cookies.remove(AUTH_TOKEN_COOKIE);
    setState({ user: null, token: null, status: 'unauthenticated' });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  }

  return context;
}
