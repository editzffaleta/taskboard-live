import { ValidationException } from "@taskboard/shared";
import { Comment } from "../../../src/comment/model";

const CARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const AUTHOR_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";

describe("Comment", () => {
  it("cria um comentario valido", () => {
    const comment = new Comment({ cardId: CARD_ID, authorId: AUTHOR_ID, text: "Oi" });

    expect(comment.text).toBe("Oi");
    expect(comment.authorId).toBe(AUTHOR_ID);
    expect(comment.cardId).toBe(CARD_ID);
  });

  it("rejeita texto vazio", () => {
    expect(() =>
      new Comment({ cardId: CARD_ID, authorId: AUTHOR_ID, text: "" }).validate(),
    ).toThrow(ValidationException);
  });
});
