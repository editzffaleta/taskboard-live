import { DomainError, NotFoundError } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import { List } from "../../../src/list/model";
import { Card } from "../../../src/card/model";
import { ChecklistItem } from "../../../src/checklist-item/model";
import { ToggleChecklistItem } from "../../../src/checklist-item/usecase/toggle-checklist-item.usecase";
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
  const useCase = new ToggleChecklistItem(
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
  const item = await checklistItemRepository.create(
    new ChecklistItem({ cardId: card.id, text: "Item", position: 0 }),
  );
  const otherCard = await cardRepository.create(
    new Card({ listId: list.id, title: "Outro cartao", position: 1 }),
  );

  return { useCase, checklistItemRepository, card, item, otherCard };
}

describe("ToggleChecklistItem", () => {
  it("alterna o done do item", async () => {
    const { useCase, card, item } = await setup();

    const { checklist } = await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      itemId: item.id,
      requesterId: MEMBER_ID,
      done: true,
    });

    expect(checklist[0].done).toBe(true);
  });

  it("rejeita item de outro cartao", async () => {
    const { useCase, otherCard, item } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: otherCard.id,
        itemId: item.id,
        requesterId: MEMBER_ID,
        done: true,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita requester nao membro", async () => {
    const { useCase, card, item } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        itemId: item.id,
        requesterId: OTHER_USER_ID,
        done: true,
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("rejeita cartao inexistente", async () => {
    const { useCase, item } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: "1b3f4a2e-8a4a-4a2a-9c3f-1a2b3c4d5e6f",
        itemId: item.id,
        requesterId: MEMBER_ID,
        done: true,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
