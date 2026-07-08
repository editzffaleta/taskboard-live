import { BoardsApiError, request } from '@/modules/boards/api/boards.api';
import type { AssigneeDto, CardDto, ChecklistItemDto } from '@/modules/boards/api/boards.api';
import type { LabelColor } from '@/modules/boards/types/board-state.type';
import type { ActivityPage } from '@/modules/boards/api/activity.api';
import { handleUnauthorized } from '@/shared/lib/session';
import type { ApiErrorResponse } from '@/shared/types/api-error.type';

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
  comments: CommentDto[];
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

/**
 * Copiar (`031`): duplica o cartão, opcionalmente para outra lista (`toListId`) e com os
 * responsáveis do original (`copyAssignees`); o novo cartão chega ao vivo via `card.created`,
 * já tratado pelo reducer existente — não é preciso ler o retorno para atualizar o estado.
 */
export function copyCard(
  token: string,
  boardId: string,
  cardId: string,
  toListId?: string,
  copyAssignees?: boolean,
): Promise<CardDto> {
  return request<CardDto>(token, `/boards/${boardId}/cards/${cardId}/copy`, {
    method: 'POST',
    body: JSON.stringify({ toListId, copyAssignees }),
  });
}

/** Define ou limpa a cor de capa do cartão (`031`), só cor — sem imagem/upload. */
export function setCardCover(
  token: string,
  boardId: string,
  cardId: string,
  cover: LabelColor | null,
): Promise<CardDto> {
  return request<CardDto>(token, `/boards/${boardId}/cards/${cardId}/cover`, {
    method: 'PATCH',
    body: JSON.stringify({ cover }),
  });
}

/** Atividade filtrada por cartão (`031`), mesmo shape `ActivityPage` de `activity.api.ts`. */
export function listCardActivity(
  token: string,
  boardId: string,
  cardId: string,
  page = 1,
  perPage = 20,
): Promise<ActivityPage> {
  const query = new URLSearchParams({ page: String(page), limit: String(perPage) });
  return request<ActivityPage>(
    token,
    `/boards/${boardId}/cards/${cardId}/activity?${query.toString()}`,
    { method: 'GET' },
  );
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

/**
 * Anexos (`032`): upload multipart, listagem de metadados, download autenticado via blob e
 * remoção — mesmo padrão de erro (`BoardsApiError`) das demais funções deste arquivo.
 */

export type AttachmentUploaderDto = {
  id: string;
  name: string;
};

export type AttachmentDto = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploadedBy: AttachmentUploaderDto;
};

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as Record<string, unknown>).errors)
  );
}

export function listAttachments(
  token: string,
  boardId: string,
  cardId: string,
): Promise<AttachmentDto[]> {
  return request<AttachmentDto[]>(token, `/boards/${boardId}/cards/${cardId}/attachments`, {
    method: 'GET',
  });
}

/**
 * Upload multipart: monta um `FormData` com o arquivo no campo `file` e chama `fetch`
 * diretamente (não reaproveita `request` porque este define `Content-Type: application/json`
 * sempre que há `body` — para multipart o `boundary` precisa ser definido pelo próprio
 * navegador, então nenhum `Content-Type` pode ser passado manualmente).
 */
export async function uploadAttachment(
  token: string,
  boardId: string,
  cardId: string,
  file: File,
): Promise<AttachmentDto> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/boards/${boardId}/cards/${cardId}/attachments`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    },
  );

  if (response.status === 401) {
    handleUnauthorized();
  }

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (isApiErrorResponse(body) && body.errors.length > 0) {
      throw new BoardsApiError(body.errors);
    }
    throw new BoardsApiError(['INTERNAL_SERVER_ERROR']);
  }

  return (await response.json()) as AttachmentDto;
}

/**
 * Download autenticado: o endpoint exige `Authorization`, então não é possível usar um
 * `<a href>` puro (o navegador não envia headers customizados em navegação simples). Baixa a
 * resposta como `blob()`, cria uma URL de objeto e dispara um `<a download>` temporário,
 * revogando a URL depois para não vazar memória.
 */
export async function downloadAttachment(
  token: string,
  boardId: string,
  cardId: string,
  attachmentId: string,
  filename: string,
): Promise<void> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/boards/${boardId}/cards/${cardId}/attachments/${attachmentId}/download`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (response.status === 401) {
    handleUnauthorized();
  }

  if (!response.ok) {
    throw new BoardsApiError(['INTERNAL_SERVER_ERROR']);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(objectUrl);
}

export function deleteAttachment(
  token: string,
  boardId: string,
  cardId: string,
  attachmentId: string,
): Promise<void> {
  return request<void>(token, `/boards/${boardId}/cards/${cardId}/attachments/${attachmentId}`, {
    method: 'DELETE',
  });
}
