import { DomainError, NotFoundError } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import { List } from "../../../src/list/model";
import { Card } from "../../../src/card/model";
import { AddChecklistItem } from "../../../src/checklist-item/usecase/add-checklist-item.usecase";
import {
  FakeCardRepository,
  FakeChecklistItemRepository,
  FakeListRepository,
  FakeMembershipRepository,
} from "../../mock";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const OTHER_BOARD_ID = "1b3f4a2e-8a4a-4a2a-9c3f-1a2b3c4d5e6f";
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
  const useCase = new AddChecklistItem(
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

  return { checklistItemRepository, cardRepository, listRepository, useCase, list, card };
}

describe("AddChecklistItem", () => {
  it("adiciona o primeiro item com position 0", async () => {
    const { useCase, card, checklistItemRepository } = await setup();

    const { checklist } = await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      requesterId: MEMBER_ID,
      text: "Fazer X",
    });

    expect(checklist).toHaveLength(1);
    expect(checklist[0].position).toBe(0);
    expect(checklist[0].done).toBe(false);
    expect(checklistItemRepository.items).toHaveLength(1);
  });

  it("calcula position como max+1", async () => {
    const { useCase, card } = await setup();

    await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      requesterId: MEMBER_ID,
      text: "Item 1",
    });
    const { checklist } = await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      requesterId: MEMBER_ID,
      text: "Item 2",
    });

    expect(checklist.map((item) => item.position)).toEqual([0, 1]);
  });

  it("rejeita texto vazio", async () => {
    const { useCase, card } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        requesterId: MEMBER_ID,
        text: "",
      }),
    ).rejects.toThrow();
  });

  it("rejeita cartao de outro quadro", async () => {
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
        text: "Item",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita requester nao membro", async () => {
    const { useCase, card } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        requesterId: OTHER_USER_ID,
        text: "Item",
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
