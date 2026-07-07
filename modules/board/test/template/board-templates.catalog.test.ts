import { BOARD_TEMPLATES } from "../../src/template/board-templates.catalog";

describe("BOARD_TEMPLATES", () => {
  it("possui ids unicos", () => {
    const ids = BOARD_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("toda lista de todo modelo possui ao menos um cartao de exemplo", () => {
    for (const template of BOARD_TEMPLATES) {
      for (const list of template.lists) {
        expect(list.cards.length).toBeGreaterThan(0);
      }
    }
  });

  it("contem os 6 modelos previstos no mockup", () => {
    const ids = BOARD_TEMPLATES.map((template) => template.id).sort();
    expect(ids).toEqual(
      [
        "bugs-engenharia",
        "crm-vendas",
        "editorial-marketing",
        "pessoal",
        "roadmap-produto",
        "scrum-engenharia",
      ].sort(),
    );
  });
});
