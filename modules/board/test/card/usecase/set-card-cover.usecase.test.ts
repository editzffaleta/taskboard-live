import { DomainError, NotFoundError, ValidationException } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import { List } from "../../../src/list/model";
import { Card } from "../../../src/card/model";
import { SetCardCover } from "../../../src/card/usecase/set-card-cover.usecase";
import {
  FakeCardRepository,
  FakeListRepository,
  FakeMembershipRepository,
} from "../../mock";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const OTHER_BOARD_ID = "1b3f4a2e-8a4a-4a2a-9c3f-1a2b3c4d5e6f";
const MEMBER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";
const OTHER_USER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";

async function setup() {
  const memberships: Membership[] = [
    new Membership({ boardId: BOARD_ID, userId: MEMBER_ID, role: "owner" }),
  ];
  const cardRepository = new FakeCardRepository();
  const listRepository = new FakeListRepository();
  const membershipRepository = new FakeMembershipRepository(memberships);
  const useCase = new SetCardCover(
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

  return { cardRepository, listRepository, membershipRepository, useCase, list, card };
}

describe("SetCardCover", () => {
  it("define a capa do cartao", async () => {
    const { useCase, card } = await setup();

    const { card: updated } = await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      requesterId: MEMBER_ID,
      cover: "green",
    });

    expect(updated.cover).toBe("green");
  });

  it("limpa a capa do cartao (idempotente)", async () => {
    const { useCase, card } = await setup();

    await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      requesterId: MEMBER_ID,
      cover: "green",
    });
    const { card: cleared } = await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      requesterId: MEMBER_ID,
      cover: null,
    });

    expect(cleared.cover).toBeNull();

    const { card: clearedAgain } = await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      requesterId: MEMBER_ID,
      cover: null,
    });
    expect(clearedAgain.cover).toBeNull();
  });

  it("rejeita cor fora da paleta", async () => {
    const { useCase, card } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        requesterId: MEMBER_ID,
        cover: "magenta" as never,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
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
        cover: "green",
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
        cover: "green",
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
