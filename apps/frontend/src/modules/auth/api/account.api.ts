import type { ApiErrorResponse } from '@/shared/types/api-error.type';
import { handleUnauthorized } from '@/shared/lib/session';

export type UpdateProfileResult = {
  id: string;
  name: string;
  email: string;
};

export class AccountApiError extends Error {
  errors: string[];

  constructor(errors: string[]) {
    super(errors.join(', '));
    this.name = 'AccountApiError';
    this.errors = errors;
  }
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as Record<string, unknown>).errors)
  );
}

async function request<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (response.status === 401) {
    handleUnauthorized();
  }

  if (!response.ok) {
    if (isApiErrorResponse(body) && body.errors.length > 0) {
      throw new AccountApiError(body.errors);
    }
    throw new AccountApiError(['INTERNAL_SERVER_ERROR']);
  }

  return body as T;
}

/** `PATCH /auth/me` (`021`) — altera o próprio `name`; `email` permanece somente leitura. */
export function updateProfile(token: string, name: string): Promise<UpdateProfileResult> {
  return request<UpdateProfileResult>(token, '/auth/me', {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

/** `PATCH /auth/me/password` (`021`) — troca a própria senha; retorna `204` sem corpo. */
export function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  return request<void>(token, '/auth/me/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

/** `DELETE /auth/me` (`021`) — exclui a própria conta; retorna `204` sem corpo. */
export function deleteAccount(token: string): Promise<void> {
  return request<void>(token, '/auth/me', { method: 'DELETE' });
}
