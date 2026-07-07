import { Controller, Get } from '@nestjs/common';
import { BOARD_TEMPLATES } from '@taskboard/board';

type BoardTemplateResponse = {
  id: string;
  name: string;
  description: string;
  category: string;
  color: string;
  lists: { title: string }[];
};

/**
 * Catalogo estatico de modelos de quadro (change `025`): autenticado (via
 * `AuthGuard` global), sem checagem de membership (nao ha quadro ainda) e
 * sem os cartoes de exemplo (so a previa das colunas), conforme decidido em
 * `design.md`.
 */
@Controller('board-templates')
export class BoardTemplateController {
  @Get()
  list(): BoardTemplateResponse[] {
    return BOARD_TEMPLATES.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      color: template.color,
      lists: template.lists.map((list) => ({ title: list.title })),
    }));
  }
}
