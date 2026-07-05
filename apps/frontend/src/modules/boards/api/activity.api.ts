import type { ApiErrorResponse } from '@/shared/types/api-error.type';
import { BoardsApiError } from '@/modules/boards/api/boards.api';

export type Activity = {
  id: string;
  boardId: string;
  actorId: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: string;
};

export type ActivityPage = {
  items: Activity[];
  page: number;
  perPage: number;
  total: number;
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

export function listActivity(
  token: string,
  boardId: string,
  page = 1,
  perPage = 20,
): Promise<ActivityPage> {
  const query = new URLSearchParams({ page: String(page), limit: String(perPage) });
  return request<ActivityPage>(token, `/boards/${boardId}/activity?${query.toString()}`, {
    method: 'GET',
  });
}
