import { ValidationException } from "@taskboard/shared";
import { Card } from "../../../src/card/model";

const LIST_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

describe("Card", () => {
  it("cria um cartao sem dueDate (default null)", () => {
    const card = new Card({ listId: LIST_ID, title: "Cartao", position: 0 });

    expect(card.dueDate).toBeNull();
  });

  it("cria um cartao com dueDate definido", () => {
    const dueDate = new Date("2026-08-01T00:00:00.000Z");
    const card = new Card({
      listId: LIST_ID,
      title: "Cartao",
      position: 0,
      dueDate,
    });

    expect(card.dueDate).toEqual(dueDate);
  });

  it("permite limpar o dueDate via clone", () => {
    const card = new Card({
      listId: LIST_ID,
      title: "Cartao",
      position: 0,
      dueDate: new Date("2026-08-01T00:00:00.000Z"),
    });

    const cleared = card.clone({ dueDate: null });

    expect(cleared.dueDate).toBeNull();
  });

  it("archivedAt ausente retorna null", () => {
    const card = new Card({ listId: LIST_ID, title: "Cartao", position: 0 });

    expect(card.archivedAt).toBeNull();
  });

  it("archivedAt presente e preservado", () => {
    const archivedAt = new Date("2026-08-01T00:00:00.000Z");
    const card = new Card({
      listId: LIST_ID,
      title: "Cartao",
      position: 0,
      archivedAt,
    });

    expect(card.archivedAt).toEqual(archivedAt);
  });

  it("clone permite arquivar e restaurar (archivedAt: null)", () => {
    const card = new Card({ listId: LIST_ID, title: "Cartao", position: 0 });

    const archived = card.clone({ archivedAt: new Date() });
    expect(archived.archivedAt).not.toBeNull();

    const restored = archived.clone({ archivedAt: null });
    expect(restored.archivedAt).toBeNull();
  });

  it("cria um cartao sem cover (default null)", () => {
    const card = new Card({ listId: LIST_ID, title: "Cartao", position: 0 });

    expect(card.cover).toBeNull();
  });

  it("cria um cartao com cover valida", () => {
    const card = new Card({
      listId: LIST_ID,
      title: "Cartao",
      position: 0,
      cover: "blue",
    });

    expect(card.cover).toBe("blue");
  });

  it("rejeita cover fora da paleta", () => {
    expect(() =>
      new Card({
        listId: LIST_ID,
        title: "Cartao",
        position: 0,
        cover: "purple-magenta" as never,
      }).validate(),
    ).toThrow(ValidationException);
  });
});
