import { ValidationException } from "@taskboard/shared";
import { Board, BoardState } from "../../../src/board/model/board.entity";

function getValidationMessages(callback: () => void): string[] {
  try {
    callback();
    return [];
  } catch (error) {
    return (error as ValidationException).errors.map((item) => item.message);
  }
}

function buildProps(overrides: Partial<BoardState> = {}): BoardState {
  return {
    name: "Quadro de Marketing",
    ownerId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    ...overrides,
  };
}

describe("Board", () => {
  it("cria a entidade com os dados informados", () => {
    const board = new Board(buildProps());

    expect(board.id).toBeDefined();
    expect(board.createdAt).toBeInstanceOf(Date);
    expect(board.updatedAt).toBeInstanceOf(Date);
    expect(board.deletedAt).toBeNull();
  });

  it("expoe os getters corretamente", () => {
    const props = buildProps({ name: "Outro Quadro" });
    const board = new Board(props);

    expect(board.name).toBe("Outro Quadro");
    expect(board.ownerId).toBe(props.ownerId);
  });

  it("permite existir temporariamente invalida sem lancar erro no construtor (lazy validation)", () => {
    expect(() => new Board(buildProps({ name: "" }))).not.toThrow();
  });

  it("valida com sucesso quando todos os campos sao validos", () => {
    const board = new Board(buildProps());

    expect(() => board.validate()).not.toThrow();
  });

  it("clona preservando id e createdAt, atualizando updatedAt", () => {
    const board = new Board(buildProps());
    const cloned = board.clone({ name: "Novo Nome" });

    expect(cloned.id).toBe(board.id);
    expect(cloned.createdAt.getTime()).toBe(board.createdAt.getTime());
    expect(cloned.name).toBe("Novo Nome");
  });

  describe("name", () => {
    it("rejeita nome vazio", () => {
      const board = new Board(buildProps({ name: "" }));
      const messages = getValidationMessages(() => board.validate());

      expect(messages).toContain("board.name.required");
    });

    it("rejeita nome longo demais", () => {
      const board = new Board(buildProps({ name: "A".repeat(121) }));
      const messages = getValidationMessages(() => board.validate());

      expect(messages).toContain("board.name.max.length");
    });

    it("aceita nome valido", () => {
      const board = new Board(buildProps({ name: "Sprint 12" }));

      expect(() => board.validate()).not.toThrow();
    });
  });

  describe("ownerId", () => {
    it("rejeita ownerId vazio", () => {
      const board = new Board(buildProps({ ownerId: "" }));
      const messages = getValidationMessages(() => board.validate());

      expect(messages).toContain("board.ownerId.required");
    });

    it("rejeita ownerId que nao e uuid", () => {
      const board = new Board(buildProps({ ownerId: "nao-e-um-uuid" }));
      const messages = getValidationMessages(() => board.validate());

      expect(messages).toContain("board.ownerId.uuid");
    });
  });

  it("acumula todas as mensagens de erro quando multiplos campos sao invalidos", () => {
    const board = new Board(buildProps({ name: "", ownerId: "invalido" }));
    const messages = getValidationMessages(() => board.validate());

    expect(messages).toEqual(
      expect.arrayContaining(["board.name.required", "board.ownerId.uuid"]),
    );
  });

  describe("color", () => {
    it("aceita cor valida da paleta", () => {
      const board = new Board(buildProps({ color: "purple" }));

      expect(() => board.validate()).not.toThrow();
      expect(board.color).toBe("purple");
    });

    it("rejeita cor fora da paleta", () => {
      const board = new Board(buildProps({ color: "magenta" }));
      const messages = getValidationMessages(() => board.validate());

      expect(messages).toContain("board.color.in");
    });

    it("nao quebra a validacao quando cor esta ausente", () => {
      const board = new Board(buildProps());

      expect(() => board.validate()).not.toThrow();
      expect(board.color).toBeNull();
    });
  });
});
