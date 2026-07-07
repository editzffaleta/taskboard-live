import { DomainError, NotFoundError } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import { List } from "../../../src/list/model";
import { Card } from "../../../src/card/model";
import { AddComment } from "../../../src/comment/usecase/add-comment.usecase";
import {
  FakeCardRepository,
  FakeCommentRepository,
  FakeListRepository,
  FakeMembershipRepository,
} from "../../mock";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const OTHER_BOARD_ID = "1b3f4a2e-8a4a-4a2a-9c3f-1a2b3c4d5e6f";
const MEMBER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";
const NON_MEMBER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";

async function setup() {
  const memberships = [
    new Membership({ boardId: BOARD_ID, userId: MEMBER_ID, role: "owner" }),
  ];
  const commentRepository = new FakeCommentRepository();
  const cardRepository = new FakeCardRepository();
  const listRepository = new FakeListRepository();
  const membershipRepository = new FakeMembershipRepository(memberships);
  const useCase = new AddComment(
    commentRepository,
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

  return { useCase, listRepository, cardRepository, card };
}

describe("AddComment", () => {
  it("cria um comentario associado ao usuario autenticado", async () => {
    const { useCase, card } = await setup();

    const { comment } = await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      authorId: MEMBER_ID,
      text: "Bom dia",
    });

    expect(comment.cardId).toBe(card.id);
    expect(comment.authorId).toBe(MEMBER_ID);
    expect(comment.text).toBe("Bom dia");
  });

  it("rejeita texto vazio", async () => {
    const { useCase, card } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        authorId: MEMBER_ID,
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
        authorId: MEMBER_ID,
        text: "Oi",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita autor que nao e membro do quadro", async () => {
    const { useCase, card } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        authorId: NON_MEMBER_ID,
        text: "Oi",
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
