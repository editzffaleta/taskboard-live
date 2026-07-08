import { DomainError, NotFoundError } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import { List } from "../../../src/list/model";
import { Card } from "../../../src/card/model";
import { Activity } from "../../../src/activity/model";
import { ListCardActivity } from "../../../src/activity/usecase/list-card-activity.usecase";
import {
  FakeActivityRepository,
  FakeMembershipRepository,
  FakeCardRepository,
  FakeListRepository,
} from "../../mock";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const OTHER_BOARD_ID = "1b3f4a2e-8a4a-4a2a-9c3f-1a2b3c4d5e6f";
const MEMBER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";
const OTHER_USER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";

async function setup() {
  const memberships: Membership[] = [
    new Membership({ boardId: BOARD_ID, userId: MEMBER_ID, role: "owner" }),
  ];
  const activityRepository = new FakeActivityRepository();
  const membershipRepository = new FakeMembershipRepository(memberships);
  const cardRepository = new FakeCardRepository();
  const listRepository = new FakeListRepository();
  const useCase = new ListCardActivity(
    activityRepository,
    membershipRepository,
    cardRepository,
    listRepository,
  );

  const list = await listRepository.create(
    new List({ boardId: BOARD_ID, title: "A Fazer", position: 0 }),
  );
  const card = await cardRepository.create(
    new Card({ listId: list.id, title: "Cartao 1", position: 0 }),
  );
  const otherCard = await cardRepository.create(
    new Card({ listId: list.id, title: "Cartao 2", position: 1 }),
  );

  return {
    activityRepository,
    membershipRepository,
    cardRepository,
    listRepository,
    useCase,
    list,
    card,
    otherCard,
  };
}

describe("ListCardActivity", () => {
  it("retorna somente as atividades do cartao especificado", async () => {
    const { activityRepository, useCase, card, otherCard } = await setup();
    await activityRepository.create(
      new Activity({
        boardId: BOARD_ID,
        actorId: MEMBER_ID,
        type: "card.created",
        data: { cardId: card.id },
        createdAt: new Date(2026, 0, 1, 0, 0),
      }),
    );
    await activityRepository.create(
      new Activity({
        boardId: BOARD_ID,
        actorId: MEMBER_ID,
        type: "card.updated",
        data: { cardId: card.id },
        createdAt: new Date(2026, 0, 1, 0, 1),
      }),
    );
    await activityRepository.create(
      new Activity({
        boardId: BOARD_ID,
        actorId: MEMBER_ID,
        type: "card.created",
        data: { cardId: otherCard.id },
        createdAt: new Date(2026, 0, 1, 0, 2),
      }),
    );

    const result = await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      requesterId: MEMBER_ID,
    });

    expect(result.activities).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(
      result.activities.every(
        (activity) => (activity.data as { cardId: string }).cardId === card.id,
      ),
    ).toBe(true);
    expect(result.activities[0].type).toBe("card.updated");
  });

  it("pagina os resultados", async () => {
    const { activityRepository, useCase, card } = await setup();
    for (let index = 0; index < 5; index += 1) {
      await activityRepository.create(
        new Activity({
          boardId: BOARD_ID,
          actorId: MEMBER_ID,
          type: "card.updated",
          data: { cardId: card.id },
          createdAt: new Date(2026, 0, 1, 0, index),
        }),
      );
    }

    const result = await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      requesterId: MEMBER_ID,
      page: 2,
      perPage: 2,
    });

    expect(result.activities).toHaveLength(2);
    expect(result.page).toBe(2);
    expect(result.perPage).toBe(2);
    expect(result.total).toBe(5);
  });

  it("rejeita cartao de outro quadro (cross-board)", async () => {
    const { useCase, listRepository, cardRepository } = await setup();
    const otherList = await listRepository.create(
      new List({ boardId: OTHER_BOARD_ID, title: "Outro", position: 0 }),
    );
    const foreignCard = await cardRepository.create(
      new Card({ listId: otherList.id, title: "Outro cartao", position: 0 }),
    );

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: foreignCard.id,
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
