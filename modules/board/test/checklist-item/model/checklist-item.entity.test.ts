import { ValidationException } from "@taskboard/shared";
import { ChecklistItem } from "../../../src/checklist-item/model";

const CARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

describe("ChecklistItem", () => {
  it("cria um item valido com done default false", () => {
    const item = new ChecklistItem({ cardId: CARD_ID, text: "Fazer X", position: 0 });

    expect(item.text).toBe("Fazer X");
    expect(item.done).toBe(false);
    expect(item.position).toBe(0);
  });

  it("rejeita texto vazio", () => {
    expect(() =>
      new ChecklistItem({ cardId: CARD_ID, text: "", position: 0 }).validate(),
    ).toThrow(ValidationException);
  });
});
