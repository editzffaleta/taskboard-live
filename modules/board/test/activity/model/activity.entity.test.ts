import { ValidationException } from "@taskboard/shared";
import { Activity } from "../../../src/activity/model";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const ACTOR_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";

describe("Activity", () => {
  it("cria uma atividade valida", () => {
    const activity = new Activity({
      boardId: BOARD_ID,
      actorId: ACTOR_ID,
      type: "card.created",
      data: { cardId: "card-1" },
    });

    expect(() => activity.validate()).not.toThrow();
    expect(activity.boardId).toBe(BOARD_ID);
    expect(activity.actorId).toBe(ACTOR_ID);
    expect(activity.type).toBe("card.created");
    expect(activity.data).toEqual({ cardId: "card-1" });
  });

  it("rejeita boardId invalido", () => {
    expect(() =>
      new Activity({
        boardId: "invalido",
        actorId: ACTOR_ID,
        type: "card.created",
        data: {},
      }).validate(),
    ).toThrow(ValidationException);
  });
});
