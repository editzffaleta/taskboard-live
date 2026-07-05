import type { ApiErrorResponse } from '@/shared/types/api-error.type';

export type Board = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
};

export class BoardsApiError extends Error {
  errors: string[];

  constructor(errors: string[]) {
    super(errors.join(', '));
    this.name = 'BoardsApiError';
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

  if (!response.ok) {
    if (isApiErrorResponse(body) && body.errors.length > 0) {
      throw new BoardsApiError(body.errors);
    }
    throw new BoardsApiError(['INTERNAL_SERVER_ERROR']);
  }

  return body as T;
}

export function listMyBoards(token: string): Promise<Board[]> {
  return request<Board[]>(token, '/boards', { method: 'GET' });
}

export function getBoard(token: string, id: string): Promise<Board> {
  return request<Board>(token, `/boards/${id}`, { method: 'GET' });
}

export function createBoard(token: string, name: string): Promise<Board> {
  return request<Board>(token, '/boards', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function renameBoard(token: string, id: string, name: string): Promise<Board> {
  return request<Board>(token, `/boards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export function deleteBoard(token: string, id: string): Promise<void> {
  return request<void>(token, `/boards/${id}`, { method: 'DELETE' });
}
