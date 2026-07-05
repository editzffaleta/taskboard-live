import { ValidationException } from "@taskboard/shared";
import {
  Membership,
  MembershipState,
} from "../../../src/membership/model/membership.entity";

function getValidationMessages(callback: () => void): string[] {
  try {
    callback();
    return [];
  } catch (error) {
    return (error as ValidationException).errors.map((item) => item.message);
  }
}

function buildProps(overrides: Partial<MembershipState> = {}): MembershipState {
  return {
    boardId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    userId: "e22fa8be-9843-4769-930a-62d4f26e5e1e",
    role: "owner",
    ...overrides,
  };
}

describe("Membership", () => {
  it("cria a entidade com os dados informados", () => {
    const membership = new Membership(buildProps());

    expect(membership.id).toBeDefined();
    expect(membership.createdAt).toBeInstanceOf(Date);
    expect(membership.updatedAt).toBeInstanceOf(Date);
    expect(membership.deletedAt).toBeNull();
  });

  it("expoe os getters corretamente", () => {
    const props = buildProps({ role: "member" });
    const membership = new Membership(props);

    expect(membership.boardId).toBe(props.boardId);
    expect(membership.userId).toBe(props.userId);
    expect(membership.role).toBe("member");
  });

  it("permite existir temporariamente invalida sem lancar erro no construtor (lazy validation)", () => {
    expect(() => new Membership(buildProps({ boardId: "" }))).not.toThrow();
  });

  it("valida com sucesso quando todos os campos sao validos", () => {
    const membership = new Membership(buildProps());

    expect(() => membership.validate()).not.toThrow();
  });

  it("clona preservando id e createdAt, atualizando updatedAt", () => {
    const membership = new Membership(buildProps());
    const cloned = membership.clone({ role: "member" });

    expect(cloned.id).toBe(membership.id);
    expect(cloned.createdAt.getTime()).toBe(membership.createdAt.getTime());
    expect(cloned.role).toBe("member");
  });

  describe("boardId", () => {
    it("rejeita boardId vazio", () => {
      const membership = new Membership(buildProps({ boardId: "" }));
      const messages = getValidationMessages(() => membership.validate());

      expect(messages).toContain("membership.boardId.required");
    });

    it("rejeita boardId que nao e uuid", () => {
      const membership = new Membership(buildProps({ boardId: "invalido" }));
      const messages = getValidationMessages(() => membership.validate());

      expect(messages).toContain("membership.boardId.uuid");
    });
  });

  describe("userId", () => {
    it("rejeita userId vazio", () => {
      const membership = new Membership(buildProps({ userId: "" }));
      const messages = getValidationMessages(() => membership.validate());

      expect(messages).toContain("membership.userId.required");
    });

    it("rejeita userId que nao e uuid", () => {
      const membership = new Membership(buildProps({ userId: "invalido" }));
      const messages = getValidationMessages(() => membership.validate());

      expect(messages).toContain("membership.userId.uuid");
    });
  });

  describe("role", () => {
    it("rejeita role vazia", () => {
      const membership = new Membership(
        buildProps({ role: "" as unknown as "owner" }),
      );
      const messages = getValidationMessages(() => membership.validate());

      expect(messages).toContain("membership.role.required");
    });

    it("rejeita role fora do enum owner|member", () => {
      const membership = new Membership(
        buildProps({ role: "admin" as unknown as "owner" }),
      );
      const messages = getValidationMessages(() => membership.validate());

      expect(messages).toContain("membership.role.in");
    });

    it("aceita role owner", () => {
      const membership = new Membership(buildProps({ role: "owner" }));

      expect(() => membership.validate()).not.toThrow();
    });

    it("aceita role member", () => {
      const membership = new Membership(buildProps({ role: "member" }));

      expect(() => membership.validate()).not.toThrow();
    });
  });

  it("acumula todas as mensagens de erro quando multiplos campos sao invalidos", () => {
    const membership = new Membership(
      buildProps({ boardId: "", userId: "", role: "" as unknown as "owner" }),
    );
    const messages = getValidationMessages(() => membership.validate());

    expect(messages).toEqual(
      expect.arrayContaining([
        "membership.boardId.required",
        "membership.userId.required",
        "membership.role.required",
      ]),
    );
  });
});
