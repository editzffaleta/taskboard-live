import type { ApiErrorResponse } from '@/shared/types/api-error.type';
import type { BoardColor, LabelColor } from '@/modules/boards/types/board-state.type';
import { handleUnauthorized } from '@/shared/lib/session';

export type Board = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  /** Cor/realce do quadro (`020`); `null` só é possível em quadros anteriores à migration. */
  color: BoardColor | null;
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
  /** Cor da capa do cartão (`031`), `null` quando não definida. */
  cover: LabelColor | null;
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
  color: BoardColor | null;
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

  if (response.status === 401) {
    handleUnauthorized();
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

/**
 * Atualiza nome e/ou cor do quadro (`020`), reaproveitando o mesmo `PATCH /boards/:id` de
 * `renameBoard` — só o owner pode chamar; o backend valida `color` contra a paleta fechada
 * (`BOARD_COLORS`) e emite `board.updated` na sala do quadro após o sucesso.
 */
export function updateBoard(
  token: string,
  id: string,
  changes: { name?: string; color?: BoardColor },
): Promise<Board> {
  return request<Board>(token, `/boards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
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
  /** Cor da capa do cartão (`031`), `null` quando não definida. */
  cover: LabelColor | null;
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

/** Arquiva/restaura (soft-delete reversível, `022`) um cartão, uma lista ou um quadro. */
export function archiveCard(token: string, boardId: string, cardId: string): Promise<void> {
  return request<void>(token, `/boards/${boardId}/cards/${cardId}/archive`, { method: 'POST' });
}

export function restoreCard(token: string, boardId: string, cardId: string): Promise<void> {
  return request<void>(token, `/boards/${boardId}/cards/${cardId}/restore`, { method: 'POST' });
}

export function archiveList(token: string, listId: string): Promise<void> {
  return request<void>(token, `/lists/${listId}/archive`, { method: 'POST' });
}

export function restoreList(token: string, listId: string): Promise<void> {
  return request<void>(token, `/lists/${listId}/restore`, { method: 'POST' });
}

export function archiveBoard(token: string, boardId: string): Promise<void> {
  return request<void>(token, `/boards/${boardId}/archive`, { method: 'POST' });
}

export function restoreBoard(token: string, boardId: string): Promise<void> {
  return request<void>(token, `/boards/${boardId}/restore`, { method: 'POST' });
}

export type ArchivedCardItem = {
  id: string;
  title: string;
  archivedAt: string;
  boardId: string;
  boardName: string;
  listId: string;
  listTitle: string;
};

export type ArchivedListItem = {
  id: string;
  title: string;
  archivedAt: string;
  boardId: string;
  boardName: string;
  cardCount: number;
};

export type ArchivedBoardItem = {
  id: string;
  name: string;
  archivedAt: string;
  listCount: number;
  cardCount: number;
};

export type ArchivedItems = {
  cards: ArchivedCardItem[];
  lists: ArchivedListItem[];
  boards: ArchivedBoardItem[];
};

export function listArchivedItems(token: string): Promise<ArchivedItems> {
  return request<ArchivedItems>(token, '/archived', { method: 'GET' });
}

/** Item de quadro retornado por `GET /search` (`023`). */
export type SearchBoardResult = { id: string; name: string };

/** Item de cartão retornado por `GET /search` (`023`), já com contexto de quadro/lista. */
export type SearchCardResult = {
  id: string;
  title: string;
  boardId: string;
  boardName: string;
  listTitle: string;
};

export type SearchResult = {
  boards: SearchBoardResult[];
  cards: SearchCardResult[];
};

/** Busca global escopada aos quadros do usuário autenticado (`023`). */
export function search(token: string, query: string): Promise<SearchResult> {
  return request<SearchResult>(token, `/search?q=${encodeURIComponent(query)}`, { method: 'GET' });
}
