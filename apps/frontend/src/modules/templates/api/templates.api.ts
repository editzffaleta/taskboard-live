import { BoardsApiError, request, type BoardDetail } from '@/modules/boards/api/boards.api';
import type { BoardColor } from '@/modules/boards/types/board-state.type';

export type BoardTemplateListItem = {
  title: string;
};

export type BoardTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  color: BoardColor;
  lists: BoardTemplateListItem[];
};

export { BoardsApiError };

/**
 * Catálogo de modelos de quadro (`025`), `GET /board-templates`: autenticado, retorna a
 * prévia das colunas (sem os cartões de exemplo). Mesmo padrão de request de `boards.api.ts`.
 */
export function listBoardTemplates(token: string): Promise<BoardTemplate[]> {
  return request<BoardTemplate[]>(token, '/board-templates', { method: 'GET' });
}

/**
 * Cria um quadro real e populado a partir de um modelo (`POST /boards/from-template`),
 * retornando o mesmo shape de `GET /boards/:id` (`BoardDetail`).
 */
export function createBoardFromTemplate(
  token: string,
  templateId: string,
  name?: string,
): Promise<BoardDetail> {
  return request<BoardDetail>(token, '/boards/from-template', {
    method: 'POST',
    body: JSON.stringify(name ? { templateId, name } : { templateId }),
  });
}
