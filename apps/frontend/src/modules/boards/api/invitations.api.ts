import type { ApiErrorResponse } from '@/shared/types/api-error.type';
import { BoardsApiError } from '@/modules/boards/api/boards.api';

export type InvitationStatus = 'pending' | 'accepted' | 'revoked';

export type InvitationPreview = {
  boardName: string;
  invitedByName: string;
  email: string;
  status: InvitationStatus;
};

export type CreatedInvitation = {
  id: string;
  email: string;
  token: string;
  status: InvitationStatus;
  link: string;
};

export type AcceptedInvitation = {
  boardId: string;
  memberCreated: boolean;
};

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as Record<string, unknown>).errors)
  );
}

async function parseResponse<T>(response: Response): Promise<T> {
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

/**
 * Consulta pública da prévia do convite — `GET /invitations/:token` não exige
 * `Authorization` (rota `@Public()` no backend, `026`).
 */
export async function getInvitationPreview(token: string): Promise<InvitationPreview> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/invitations/${token}`, {
    method: 'GET',
  });

  return parseResponse<InvitationPreview>(response);
}

/**
 * Aceita o convite — exige usuário autenticado; o backend valida que o e-mail do
 * usuário logado corresponde ao e-mail do convite (`invitation.email.mismatch`, `026`).
 */
export async function acceptInvitation(authToken: string, token: string): Promise<AcceptedInvitation> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/invitations/${token}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
  });

  return parseResponse<AcceptedInvitation>(response);
}

/**
 * Cria (ou reaproveita, se `pending`) um convite por e-mail para o quadro — só o
 * owner pode chamar (`board.owner.required`).
 */
export async function createInvitation(
  authToken: string,
  boardId: string,
  email: string,
): Promise<CreatedInvitation> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/boards/${boardId}/invitations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ email }),
  });

  return parseResponse<CreatedInvitation>(response);
}
