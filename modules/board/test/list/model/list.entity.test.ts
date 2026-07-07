import { List } from "../../../src/list/model";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

describe("List", () => {
  it("archivedAt ausente retorna null", () => {
    const list = new List({ boardId: BOARD_ID, title: "A Fazer", position: 0 });

    expect(list.archivedAt).toBeNull();
  });

  it("archivedAt presente e preservado", () => {
    const archivedAt = new Date("2026-08-01T00:00:00.000Z");
    const list = new List({
      boardId: BOARD_ID,
      title: "A Fazer",
      position: 0,
      archivedAt,
    });

    expect(list.archivedAt).toEqual(archivedAt);
  });

  it("clone permite arquivar e restaurar (archivedAt: null)", () => {
    const list = new List({ boardId: BOARD_ID, title: "A Fazer", position: 0 });

    const archived = list.clone({ archivedAt: new Date() });
    expect(archived.archivedAt).not.toBeNull();

    const restored = archived.clone({ archivedAt: null });
    expect(restored.archivedAt).toBeNull();
  });
});
