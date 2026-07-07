import { DomainError, NotFoundError } from "@taskboard/shared";
import { Comment } from "../../../src/comment/model";
import { DeleteComment } from "../../../src/comment/usecase/delete-comment.usecase";
import { FakeCommentRepository } from "../../mock";

const CARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const BOARD_ID = "1b3f4a2e-8a4a-4a2a-9c3f-1a2b3c4d5e6f";
const AUTHOR_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";
const OTHER_USER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";

async function setup() {
  const commentRepository = new FakeCommentRepository();
  const useCase = new DeleteComment(commentRepository);
  const comment = await commentRepository.create(
    new Comment({ cardId: CARD_ID, authorId: AUTHOR_ID, text: "Oi" }),
  );

  return { useCase, commentRepository, comment };
}

describe("DeleteComment", () => {
  it("permite que o autor exclua o proprio comentario", async () => {
    const { useCase, commentRepository, comment } = await setup();

    const result = await useCase.execute({
      boardId: BOARD_ID,
      cardId: CARD_ID,
      commentId: comment.id,
      requesterId: AUTHOR_ID,
    });

    expect(result).toEqual({ commentId: comment.id, cardId: CARD_ID });
    expect(await commentRepository.findById(comment.id)).toBeNull();
  });

  it("rejeita exclusao por quem nao e o autor", async () => {
    const { useCase, comment } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: CARD_ID,
        commentId: comment.id,
        requesterId: OTHER_USER_ID,
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("rejeita comentario inexistente", async () => {
    const { useCase } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: CARD_ID,
        commentId: "df10ec49-9d19-4a83-93b0-2f8558d99742",
        requesterId: AUTHOR_ID,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita comentario de outro cartao", async () => {
    const { useCase, commentRepository } = await setup();
    const otherComment = await commentRepository.create(
      new Comment({
        cardId: "df10ec49-9d19-4a83-93b0-2f8558d99742",
        authorId: AUTHOR_ID,
        text: "Outro",
      }),
    );

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: CARD_ID,
        commentId: otherComment.id,
        requesterId: AUTHOR_ID,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
