"use client";
// Contexto de auth + hook useAuth. Hidrata a sessao do storage no carregamento.
// Ajuste imports, o contrato de login e a estrategia de storage ao projeto.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, configureApiClient } from "../lib/api-client";

interface AuthUser {
  id: string;
  email: string;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const TOKEN_KEY = "app.token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
  }, []);

  // injeta token + handler de 401 no cliente HTTP
  useEffect(() => {
    configureApiClient({ getToken: () => token, onUnauthorized: logout });
  }, [token, logout]);

  // hidrata a sessao no boot
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    if (saved) setToken(saved);
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    setUser(data.user);
    if (typeof window !== "undefined") window.localStorage.setItem(TOKEN_KEY, data.token);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: !!token, isLoading, login, logout }),
    [user, token, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
