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

export type LabelState = {
  id: string;
  name: string;
  color: LabelColor;
};

export type CardState = {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  position: number;
  labels: LabelState[];
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
  lists: ListState[];
  /** Catálogo de etiquetas do quadro (independente das atribuídas a cada cartão). */
  labels: LabelState[];
};
