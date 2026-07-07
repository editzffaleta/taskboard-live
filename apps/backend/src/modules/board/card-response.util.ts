import type {
  Card,
  CardAssigneeRepository,
  CardLabelRepository,
  ChecklistItemRepository,
  LabelRepository,
  MemberDirectory,
} from '@taskboard/board';

export type CardLabelResponse = {
  id: string;
  name: string;
  color: string;
};

export type CardAssigneeResponse = {
  id: string;
  name: string;
};

export type CardChecklistItemResponse = {
  id: string;
  text: string;
  done: boolean;
  position: number;
};

export type CardResponse = {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  position: number;
  createdAt: Date;
  labels: CardLabelResponse[];
  dueDate: string | null;
  assignees: CardAssigneeResponse[];
  checklist: CardChecklistItemResponse[];
};

export async function buildCardResponse(
  card: Card,
  cardLabelRepository: CardLabelRepository,
  labelRepository: LabelRepository,
  checklistItemRepository: ChecklistItemRepository,
  cardAssigneeRepository: CardAssigneeRepository,
  memberDirectory: MemberDirectory,
): Promise<CardResponse> {
  const labelIds = await cardLabelRepository.findAllByCardId(card.id);
  const labels = await Promise.all(
    labelIds.map((labelId) => labelRepository.findById(labelId)),
  );

  const checklist = await checklistItemRepository.findAllByCardId(card.id);

  const assigneeIds = await cardAssigneeRepository.findAllByCardId(card.id);
  const assignees = await Promise.all(
    assigneeIds.map((userId) => memberDirectory.findById(userId)),
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
    dueDate: card.dueDate ? card.dueDate.toISOString() : null,
    assignees: assignees
      .filter((user): user is NonNullable<typeof user> => user !== null)
      .map((user) => ({ id: user.id, name: user.name })),
    checklist: [...checklist]
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        id: item.id,
        text: item.text,
        done: item.done,
        position: item.position,
      })),
  };
}
