export interface BoardTemplateCard {
  title: string;
}

export interface BoardTemplateList {
  title: string;
  cards: BoardTemplateCard[];
}

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  color: string;
  lists: BoardTemplateList[];
}
