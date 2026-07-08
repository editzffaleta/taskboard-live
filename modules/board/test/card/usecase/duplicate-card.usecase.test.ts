import { DomainError, NotFoundError } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import { List } from "../../../src/list/model";
import { Card } from "../../../src/card/model";
import { ChecklistItem } from "../../../src/checklist-item/model";
import { DuplicateCard } from "../../../src/card/usecase/duplicate-card.usecase";
import {
  FakeCardRepository,
  FakeListRepository,
  FakeMembershipRepository,
  FakeCardLabelRepository,
  FakeChecklistItemRepository,
  FakeCardAssigneeRepository,
} from "../../mock";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const OTHER_BOARD_ID = "1b3f4a2e-8a4a-4a2a-9c3f-1a2b3c4d5e6f";
const MEMBER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";
const OTHER_USER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";
const LABEL_ID = "7a1c2c5e-1a2b-4c3d-9e8f-2b3c4d5e6f70";
const ASSIGNEE_ID = "6b2c3c5e-1a2b-4c3d-9e8f-2b3c4d5e6f71";

async function setup() {
  const memberships: Membership[] = [
    new Membership({ boardId: BOARD_ID, userId: MEMBER_ID, role: "owner" }),
  ];
  const cardRepository = new FakeCardRepository();
  const listRepository = new FakeListRepository();
  const membershipRepository = new FakeMembershipRepository(memberships);
  const cardLabelRepository = new FakeCardLabelRepository();
  const checklistItemRepository = new FakeChecklistItemRepository();
  const cardAssigneeRepository = new FakeCardAssigneeRepository();
  const useCase = new DuplicateCard(
    cardRepository,
    listRepository,
    membershipRepository,
    cardLabelRepository,
    checklistItemRepository,
    cardAssigneeRepository,
  );

  const list = await listRepository.create(
    new List({ boardId: BOARD_ID, title: "A Fazer", position: 0 }),
  );
  const destinationList = await listRepository.create(
    new List({ boardId: BOARD_ID, title: "Feito", position: 1 }),
  );
  const card = await cardRepository.create(
    new Card({
      listId: list.id,
      title: "Cartao",
      description: "Descricao",
      position: 0,
      dueDate: new Date("2026-08-01T00:00:00.000Z"),
      cover: "blue",
    }),
  );

  return {
    cardRepository,
    listRepository,
    membershipRepository,
    cardLabelRepository,
    checklistItemRepository,
    cardAssigneeRepository,
    useCase,
    list,
    destinationList,
    card,
  };
}

describe("DuplicateCard", () => {
  it("copia o cartao na mesma lista, sem copiar cover/comentarios/assignees", async () => {
    const { useCase, card, list, cardLabelRepository, checklistItemRepository } =
      await setup();
    await cardLabelRepository.assign(card.id, LABEL_ID);
    await checklistItemRepository.create(
      new ChecklistItem({ cardId: card.id, text: "Item 1", position: 0 }),
    );

    const { card: copy } = await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      requesterId: MEMBER_ID,
    });

    expect(copy.listId).toBe(list.id);
    expect(copy.title).toBe("Cartao (cópia)");
    expect(copy.description).toBe("Descricao");
    expect(copy.dueDate).toEqual(card.dueDate);
    expect(copy.cover).toBeNull();
    expect(copy.position).toBe(1);

    const copyLabels = await cardLabelRepository.findAllByCardId(copy.id);
    expect(copyLabels).toEqual([LABEL_ID]);

    const copyChecklist = await checklistItemRepository.findAllByCardId(
      copy.id,
    );
    expect(copyChecklist).toHaveLength(1);
    expect(copyChecklist[0].text).toBe("Item 1");
    expect(copyChecklist[0].id).not.toBe(card.id);
  });

  it("copia o cartao para uma lista destino", async () => {
    const { useCase, card, destinationList } = await setup();

    const { card: copy } = await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      requesterId: MEMBER_ID,
      toListId: destinationList.id,
    });

    expect(copy.listId).toBe(destinationList.id);
    expect(copy.position).toBe(0);
  });

  it("copia assignees somente quando copyAssignees e true", async () => {
    const { useCase, card, cardAssigneeRepository } = await setup();
    await cardAssigneeRepository.assign(card.id, ASSIGNEE_ID);

    const { card: withoutCopy } = await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      requesterId: MEMBER_ID,
    });
    expect(await cardAssigneeRepository.findAllByCardId(withoutCopy.id)).toEqual(
      [],
    );

    const { card: withCopy } = await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      requesterId: MEMBER_ID,
      copyAssignees: true,
    });
    expect(await cardAssigneeRepository.findAllByCardId(withCopy.id)).toEqual([
      ASSIGNEE_ID,
    ]);
  });

  it("copia um cartao sem checklist/labels/assignees", async () => {
    const { useCase, card, cardLabelRepository, checklistItemRepository } =
      await setup();

    const { card: copy } = await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      requesterId: MEMBER_ID,
    });

    expect(await cardLabelRepository.findAllByCardId(copy.id)).toEqual([]);
    expect(await checklistItemRepository.findAllByCardId(copy.id)).toEqual([]);
  });

  it("rejeita toListId de outro quadro", async () => {
    const { useCase, card, listRepository } = await setup();
    const otherList = await listRepository.create(
      new List({ boardId: OTHER_BOARD_ID, title: "Outro", position: 0 }),
    );

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        requesterId: MEMBER_ID,
        toListId: otherList.id,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita cartao de outro quadro (cross-board)", async () => {
    const { useCase, listRepository, cardRepository } = await setup();
    const otherList = await listRepository.create(
      new List({ boardId: OTHER_BOARD_ID, title: "Outro", position: 0 }),
    );
    const otherCard = await cardRepository.create(
      new Card({ listId: otherList.id, title: "Outro cartao", position: 0 }),
    );

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: otherCard.id,
        requesterId: MEMBER_ID,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita requester que nao e membro do quadro", async () => {
    const { useCase, card } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        requesterId: OTHER_USER_ID,
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
