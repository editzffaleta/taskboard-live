import { DomainError, NotFoundError } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import { List } from "../../../src/list/model";
import { Card } from "../../../src/card/model";
import { Comment } from "../../../src/comment/model";
import { ListComments } from "../../../src/comment/usecase/list-comments.usecase";
import {
  FakeCardRepository,
  FakeCommentRepository,
  FakeListRepository,
  FakeMembershipRepository,
} from "../../mock";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
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
  const useCase = new ListComments(
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

  await commentRepository.create(
    new Comment({
      cardId: card.id,
      authorId: MEMBER_ID,
      text: "Primeiro",
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
    }),
  );
  await commentRepository.create(
    new Comment({
      cardId: card.id,
      authorId: MEMBER_ID,
      text: "Segundo",
      createdAt: new Date("2026-07-02T00:00:00.000Z"),
    }),
  );

  return { useCase, card };
}

describe("ListComments", () => {
  it("retorna comentarios do mais recente para o mais antigo, paginado", async () => {
    const { useCase, card } = await setup();

    const { comments, total } = await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      requesterId: MEMBER_ID,
      page: 1,
      pageSize: 10,
    });

    expect(total).toBe(2);
    expect(comments.map((comment) => comment.text)).toEqual(["Segundo", "Primeiro"]);
  });

  it("rejeita requester que nao e membro do quadro", async () => {
    const { useCase, card } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        requesterId: NON_MEMBER_ID,
        page: 1,
        pageSize: 10,
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("rejeita cartao inexistente", async () => {
    const { useCase } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: "1b3f4a2e-8a4a-4a2a-9c3f-1a2b3c4d5e6f",
        requesterId: MEMBER_ID,
        page: 1,
        pageSize: 10,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
