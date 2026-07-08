import type { ApiErrorResponse } from '@/shared/types/api-error.type';
import { handleUnauthorized } from '@/shared/lib/session';

export type NotificationType = 'member.added.you' | 'card.assigned.you' | 'comment.added';

export type NotificationDto = {
  id: string;
  type: NotificationType | string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type NotificationPage = {
  items: NotificationDto[];
  page: number;
  perPage: number;
  total: number;
};

export class NotificationsApiError extends Error {
  errors: string[];

  constructor(errors: string[]) {
    super(errors.join(', '));
    this.name = 'NotificationsApiError';
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
      throw new NotificationsApiError(body.errors);
    }
    throw new NotificationsApiError(['INTERNAL_SERVER_ERROR']);
  }

  return body as T;
}

export function listNotifications(
  token: string,
  page = 1,
  perPage = 20,
): Promise<NotificationPage> {
  const query = new URLSearchParams({ page: String(page), limit: String(perPage) });
  return request<NotificationPage>(token, `/notifications?${query.toString()}`, {
    method: 'GET',
  });
}

export function countUnreadNotifications(token: string): Promise<{ count: number }> {
  return request<{ count: number }>(token, '/notifications/unread-count', { method: 'GET' });
}

export function markNotificationRead(token: string, id: string): Promise<void> {
  return request<void>(token, `/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead(token: string): Promise<void> {
  return request<void>(token, '/notifications/read-all', { method: 'POST' });
}
