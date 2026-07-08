export const LABEL_COLORS = [
  'red',
  'amber',
  'green',
  'blue',
  'purple',
  'teal',
  'pink',
] as const;

export type LabelColor = (typeof LABEL_COLORS)[number];

/** Paleta fechada de cor/realce do quadro (`020`), espelhando `BOARD_COLORS` do backend. */
export const BOARD_COLORS = [
  'blue',
  'purple',
  'green',
  'red',
  'amber',
  'cyan',
  'slate',
] as const;

export type BoardColor = (typeof BOARD_COLORS)[number];

export type LabelState = {
  id: string;
  name: string;
  color: LabelColor;
};

export type AssigneeState = {
  id: string;
  name: string;
};

export type ChecklistItemState = {
  id: string;
  text: string;
  done: boolean;
  position: number;
};

export type CardState = {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  position: number;
  labels: LabelState[];
  dueDate: string | null;
  assignees: AssigneeState[];
  checklist: ChecklistItemState[];
  /** Cor da capa do cartão (`031`), `null` quando não definida — só cor, sem imagem/upload. */
  cover: LabelColor | null;
};

export type ListState = {
  id: string;
  title: string;
  position: number;
  cards: CardState[];
};

export type BoardState = {
  id: string;
  name: string;
  ownerId: string;
  /** Cor/realce do quadro (`020`); `null` só é possível em quadros anteriores à migration. */
  color: BoardColor | null;
  lists: ListState[];
  /** Catálogo de etiquetas do quadro (independente das atribuídas a cada cartão). */
  labels: LabelState[];
  /**
   * Contador de comentários por cartão, mantido somente em memória (o payload de cartão do
   * backend não inclui contagem de comentários — ver `design.md` da `018`). Alimentado ao
   * vivo por `comment.created`/`comment.deleted` e hidratado quando a aba de comentários de
   * um cartão é aberta pela primeira vez nesta sessão (via `total` de `listComments`).
   */
  commentsCountByCardId: Record<string, number>;
};
