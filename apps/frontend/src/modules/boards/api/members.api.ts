import type { ApiErrorResponse } from '@/shared/types/api-error.type';
import { BoardsApiError } from '@/modules/boards/api/boards.api';

export type BoardMemberRole = 'owner' | 'member';

export type BoardMember = {
  userId: string;
  name: string;
  email: string;
  role: BoardMemberRole;
};

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

export function listMembers(token: string, boardId: string): Promise<BoardMember[]> {
  return request<BoardMember[]>(token, `/boards/${boardId}/members`, { method: 'GET' });
}

export function addMember(token: string, boardId: string, email: string): Promise<BoardMember> {
  return request<BoardMember>(token, `/boards/${boardId}/members`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function removeMember(token: string, boardId: string, userId: string): Promise<void> {
  return request<void>(token, `/boards/${boardId}/members/${userId}`, { method: 'DELETE' });
}
