export type CardState = {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  position: number;
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
  lists: ListState[];
};
