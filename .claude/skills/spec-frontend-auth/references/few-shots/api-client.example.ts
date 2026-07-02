// Cliente HTTP tipado. Centraliza TODA chamada: anexa JWT, trata ApiErrorResponse,
// e em 401 limpa a sessao e redireciona. Ajuste imports ao projeto.
import type { ApiErrorResponse } from "../types/api-error.type";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// Fonte do token e do "logout em 401" injetadas pelo contexto de auth.
let getToken: () => string | null = () => null;
let onUnauthorized: () => void = () => {};

export function configureApiClient(opts: {
  getToken: () => string | null;
  onUnauthorized: () => void;
}) {
  getToken = opts.getToken;
  onUnauthorized = opts.onUnauthorized;
}

export class ApiError extends Error {
  constructor(public status: number, public payload: ApiErrorResponse) {
    super(payload?.message ?? "api.error");
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (res.status === 401) {
    onUnauthorized(); // limpa sessao + redireciona pro login
    const body = (await safeJson(res)) as ApiErrorResponse;
    throw new ApiError(401, body);
  }

  if (!res.ok) {
    const body = (await safeJson(res)) as ApiErrorResponse;
    throw new ApiError(res.status, body);
  }

  return (await safeJson(res)) as T;
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}
