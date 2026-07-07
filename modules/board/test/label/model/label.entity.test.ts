import { ValidationException } from "@taskboard/shared";
import { Label } from "../../../src/label/model";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

describe("Label", () => {
  it("cria uma etiqueta valida", () => {
    const label = new Label({ boardId: BOARD_ID, name: "Backend", color: "blue" });

    expect(label.name).toBe("Backend");
    expect(label.color).toBe("blue");
    expect(label.boardId).toBe(BOARD_ID);
  });

  it("rejeita nome vazio", () => {
    expect(() =>
      new Label({ boardId: BOARD_ID, name: "", color: "blue" }).validate(),
    ).toThrow(ValidationException);
  });

  it("rejeita cor fora da paleta", () => {
    expect(() =>
      new Label({
        boardId: BOARD_ID,
        name: "Backend",
        // @ts-expect-error cor invalida propositalmente para o teste
        color: "black",
      }).validate(),
    ).toThrow(ValidationException);
  });
});
