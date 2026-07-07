import { request } from '@/modules/boards/api/boards.api';
import type { AssigneeDto, ChecklistItemDto } from '@/modules/boards/api/boards.api';

/**
 * Chamadas HTTP dos endpoints de prazo/checklist/responsáveis/comentários entregues pela
 * `017`, reaproveitando a função `request`/`BoardsApiError` já exportada de `boards.api.ts`
 * (nenhuma duplicação de tratamento de erro).
 */

export type CommentDto = {
  id: string;
  cardId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
};

export type ListCommentsResult = {
  items: CommentDto[];
  total: number;
};

export function setCardDueDate(
  token: string,
  boardId: string,
  cardId: string,
  dueDate: string | null,
): Promise<void> {
  return request<void>(token, `/boards/${boardId}/cards/${cardId}/due`, {
    method: 'PATCH',
    body: JSON.stringify({ dueDate }),
  });
}

export function addChecklistItem(
  token: string,
  boardId: string,
  cardId: string,
  text: string,
): Promise<ChecklistItemDto> {
  return request<ChecklistItemDto>(token, `/boards/${boardId}/cards/${cardId}/checklist`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export function toggleChecklistItem(
  token: string,
  boardId: string,
  cardId: string,
  itemId: string,
  done: boolean,
): Promise<void> {
  return request<void>(token, `/boards/${boardId}/cards/${cardId}/checklist/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ done }),
  });
}

export function editChecklistItem(
  token: string,
  boardId: string,
  cardId: string,
  itemId: string,
  text: string,
): Promise<void> {
  return request<void>(token, `/boards/${boardId}/cards/${cardId}/checklist/${itemId}/text`, {
    method: 'PATCH',
    body: JSON.stringify({ text }),
  });
}

export function deleteChecklistItem(
  token: string,
  boardId: string,
  cardId: string,
  itemId: string,
): Promise<void> {
  return request<void>(token, `/boards/${boardId}/cards/${cardId}/checklist/${itemId}`, {
    method: 'DELETE',
  });
}

export function reorderChecklistItems(
  token: string,
  boardId: string,
  cardId: string,
  itemIds: string[],
): Promise<void> {
  return request<void>(token, `/boards/${boardId}/cards/${cardId}/checklist/order`, {
    method: 'PUT',
    body: JSON.stringify({ itemIds }),
  });
}

export function assignUser(
  token: string,
  boardId: string,
  cardId: string,
  userId: string,
): Promise<AssigneeDto> {
  return request<AssigneeDto>(token, `/boards/${boardId}/cards/${cardId}/assignees/${userId}`, {
    method: 'PUT',
  });
}

export function unassignUser(
  token: string,
  boardId: string,
  cardId: string,
  userId: string,
): Promise<void> {
  return request<void>(token, `/boards/${boardId}/cards/${cardId}/assignees/${userId}`, {
    method: 'DELETE',
  });
}

export function addComment(
  token: string,
  boardId: string,
  cardId: string,
  text: string,
): Promise<CommentDto> {
  return request<CommentDto>(token, `/boards/${boardId}/cards/${cardId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export function listComments(
  token: string,
  boardId: string,
  cardId: string,
  page: number,
  pageSize: number,
): Promise<ListCommentsResult> {
  return request<ListCommentsResult>(
    token,
    `/boards/${boardId}/cards/${cardId}/comments?page=${page}&pageSize=${pageSize}`,
    { method: 'GET' },
  );
}

export function deleteComment(
  token: string,
  boardId: string,
  cardId: string,
  commentId: string,
): Promise<void> {
  return request<void>(token, `/boards/${boardId}/cards/${cardId}/comments/${commentId}`, {
    method: 'DELETE',
  });
}
