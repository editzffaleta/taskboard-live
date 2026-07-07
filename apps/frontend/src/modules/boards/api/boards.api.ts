import type { ApiErrorResponse } from '@/shared/types/api-error.type';
import type { LabelColor } from '@/modules/boards/types/board-state.type';

export type Board = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
};

export type LabelDto = {
  id: string;
  name: string;
  color: LabelColor;
};

export type AssigneeDto = {
  id: string;
  name: string;
};

export type ChecklistItemDto = {
  id: string;
  text: string;
  done: boolean;
  position: number;
};

export type BoardDetailCard = {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  position: number;
  labels: LabelDto[];
  dueDate: string | null;
  assignees: AssigneeDto[];
  checklist: ChecklistItemDto[];
};

export type BoardDetailList = {
  id: string;
  boardId: string;
  title: string;
  position: number;
  cards: BoardDetailCard[];
};

export type BoardDetail = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  lists: BoardDetailList[];
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

export async function request<T>(token: string, path: string, init?: RequestInit): Promise<T> {
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

export function getBoard(token: string, id: string): Promise<BoardDetail> {
  return request<BoardDetail>(token, `/boards/${id}`, { method: 'GET' });
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

export type ListDto = {
  id: string;
  boardId: string;
  title: string;
  position: number;
  createdAt: string;
};

export type CardDto = {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  position: number;
  createdAt: string;
  labels: LabelDto[];
  dueDate: string | null;
  assignees: AssigneeDto[];
  checklist: ChecklistItemDto[];
};

export type CardMoveResult = {
  cardId: string;
  fromListId: string;
  toListId: string;
  position: number;
};

export function createList(token: string, boardId: string, title: string): Promise<ListDto> {
  return request<ListDto>(token, `/boards/${boardId}/lists`, {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export function renameList(token: string, listId: string, title: string): Promise<ListDto> {
  return request<ListDto>(token, `/lists/${listId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
}

export function deleteList(token: string, listId: string): Promise<void> {
  return request<void>(token, `/lists/${listId}`, { method: 'DELETE' });
}

export function moveList(token: string, listId: string, position: number): Promise<ListDto[]> {
  return request<ListDto[]>(token, `/lists/${listId}/move`, {
    method: 'PATCH',
    body: JSON.stringify({ position }),
  });
}

export function createCard(
  token: string,
  boardId: string,
  listId: string,
  title: string,
): Promise<CardDto> {
  return request<CardDto>(token, `/boards/${boardId}/cards`, {
    method: 'POST',
    body: JSON.stringify({ listId, title }),
  });
}

export function renameCard(
  token: string,
  boardId: string,
  cardId: string,
  title: string,
  description?: string | null,
): Promise<CardDto> {
  return request<CardDto>(token, `/boards/${boardId}/cards/${cardId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title, description }),
  });
}

export function deleteCard(token: string, boardId: string, cardId: string): Promise<void> {
  return request<void>(token, `/boards/${boardId}/cards/${cardId}`, { method: 'DELETE' });
}

export function moveCard(
  token: string,
  boardId: string,
  cardId: string,
  toListId: string,
  position: number,
): Promise<CardMoveResult> {
  return request<CardMoveResult>(token, `/boards/${boardId}/cards/${cardId}/move`, {
    method: 'PATCH',
    body: JSON.stringify({ toListId, position }),
  });
}

export function listLabels(token: string, boardId: string): Promise<LabelDto[]> {
  return request<LabelDto[]>(token, `/boards/${boardId}/labels`, { method: 'GET' });
}

export function createLabel(
  token: string,
  boardId: string,
  name: string,
  color: LabelColor,
): Promise<LabelDto> {
  return request<LabelDto>(token, `/boards/${boardId}/labels`, {
    method: 'POST',
    body: JSON.stringify({ name, color }),
  });
}

export function updateLabel(
  token: string,
  boardId: string,
  labelId: string,
  changes: { name?: string; color?: LabelColor },
): Promise<LabelDto> {
  return request<LabelDto>(token, `/boards/${boardId}/labels/${labelId}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });
}

export function deleteLabel(token: string, boardId: string, labelId: string): Promise<void> {
  return request<void>(token, `/boards/${boardId}/labels/${labelId}`, { method: 'DELETE' });
}

export function assignLabel(
  token: string,
  boardId: string,
  cardId: string,
  labelId: string,
): Promise<CardDto> {
  return request<CardDto>(token, `/boards/${boardId}/cards/${cardId}/labels/${labelId}`, {
    method: 'PUT',
  });
}

export function unassignLabel(
  token: string,
  boardId: string,
  cardId: string,
  labelId: string,
): Promise<void> {
  return request<void>(token, `/boards/${boardId}/cards/${cardId}/labels/${labelId}`, {
    method: 'DELETE',
  });
}
