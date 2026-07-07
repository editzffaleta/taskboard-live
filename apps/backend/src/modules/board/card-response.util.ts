import type {
  Card,
  CardLabelRepository,
  LabelRepository,
} from '@taskboard/board';

export type CardLabelResponse = {
  id: string;
  name: string;
  color: string;
};

export type CardResponse = {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  position: number;
  createdAt: Date;
  labels: CardLabelResponse[];
};

export async function buildCardResponse(
  card: Card,
  cardLabelRepository: CardLabelRepository,
  labelRepository: LabelRepository,
): Promise<CardResponse> {
  const labelIds = await cardLabelRepository.findAllByCardId(card.id);
  const labels = await Promise.all(
    labelIds.map((labelId) => labelRepository.findById(labelId)),
  );

  return {
    id: card.id,
    listId: card.listId,
    title: card.title,
    description: card.description,
    position: card.position,
    createdAt: card.createdAt,
    labels: labels
      .filter((label): label is NonNullable<typeof label> => label !== null)
      .map((label) => ({ id: label.id, name: label.name, color: label.color })),
  };
}
