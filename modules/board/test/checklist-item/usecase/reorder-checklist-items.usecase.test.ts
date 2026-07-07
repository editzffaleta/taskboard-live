import { DomainError, NotFoundError } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import { List } from "../../../src/list/model";
import { Card } from "../../../src/card/model";
import { ChecklistItem } from "../../../src/checklist-item/model";
import { ReorderChecklistItems } from "../../../src/checklist-item/usecase/reorder-checklist-items.usecase";
import {
  FakeCardRepository,
  FakeChecklistItemRepository,
  FakeListRepository,
  FakeMembershipRepository,
} from "../../mock";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const MEMBER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";
const OTHER_USER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";

async function setup() {
  const memberships = [
    new Membership({ boardId: BOARD_ID, userId: MEMBER_ID, role: "owner" }),
  ];
  const checklistItemRepository = new FakeChecklistItemRepository();
  const cardRepository = new FakeCardRepository();
  const listRepository = new FakeListRepository();
  const membershipRepository = new FakeMembershipRepository(memberships);
  const useCase = new ReorderChecklistItems(
    checklistItemRepository,
    cardRepository,
    listRepository,
    membershipRepository,
  );

  const list = await listRepository.create(
    new List({ boardId: BOARD_ID, title: "A Fazer", position: 0 }),
  );
  const card = await cardRepository.create(
    new Card({ listId: list.id, title: "Cartao", position: 0 }),
  );
  const itemA = await checklistItemRepository.create(
    new ChecklistItem({ cardId: card.id, text: "A", position: 0 }),
  );
  const itemB = await checklistItemRepository.create(
    new ChecklistItem({ cardId: card.id, text: "B", position: 1 }),
  );

  return { useCase, card, itemA, itemB };
}

describe("ReorderChecklistItems", () => {
  it("reatribui position sequencialmente conforme a nova ordem", async () => {
    const { useCase, card, itemA, itemB } = await setup();

    const { checklist } = await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      requesterId: MEMBER_ID,
      itemIds: [itemB.id, itemA.id],
    });

    const byId = new Map(checklist.map((item) => [item.id, item.position]));
    expect(byId.get(itemB.id)).toBe(0);
    expect(byId.get(itemA.id)).toBe(1);
  });

  it("rejeita lista de ids vazia", async () => {
    const { useCase, card } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        requesterId: MEMBER_ID,
        itemIds: [],
      }),
    ).rejects.toThrow();
  });

  it("rejeita quando algum id nao pertence ao cartao", async () => {
    const { useCase, card, itemA } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        requesterId: MEMBER_ID,
        itemIds: [itemA.id, "1b3f4a2e-8a4a-4a2a-9c3f-1a2b3c4d5e6f"],
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("rejeita requester nao membro", async () => {
    const { useCase, card, itemA, itemB } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        requesterId: OTHER_USER_ID,
        itemIds: [itemA.id, itemB.id],
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("rejeita cartao inexistente", async () => {
    const { useCase, itemA, itemB } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: "1b3f4a2e-8a4a-4a2a-9c3f-1a2b3c4d5e6f",
        requesterId: MEMBER_ID,
        itemIds: [itemA.id, itemB.id],
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
