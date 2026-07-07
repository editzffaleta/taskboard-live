import { ValidationException } from "@taskboard/shared";
import {
  Invitation,
  InvitationState,
} from "../../../src/invitation/model/invitation.entity";

function getValidationMessages(callback: () => void): string[] {
  try {
    callback();
    return [];
  } catch (error) {
    return (error as ValidationException).errors.map((item) => item.message);
  }
}

function buildProps(overrides: Partial<InvitationState> = {}): InvitationState {
  return {
    boardId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    email: "convidado@example.com",
    token: "token-123",
    role: "member",
    status: "pending",
    invitedById: "e22fa8be-9843-4769-930a-62d4f26e5e1e",
    ...overrides,
  };
}

describe("Invitation", () => {
  it("cria a entidade com os dados informados", () => {
    const invitation = new Invitation(buildProps());

    expect(invitation.id).toBeDefined();
    expect(invitation.createdAt).toBeInstanceOf(Date);
  });

  it("expoe os getters corretamente", () => {
    const props = buildProps();
    const invitation = new Invitation(props);

    expect(invitation.boardId).toBe(props.boardId);
    expect(invitation.email).toBe(props.email);
    expect(invitation.token).toBe(props.token);
    expect(invitation.role).toBe("member");
    expect(invitation.status).toBe("pending");
    expect(invitation.invitedById).toBe(props.invitedById);
  });

  it("valida com sucesso quando todos os campos sao validos", () => {
    const invitation = new Invitation(buildProps());

    expect(() => invitation.validate()).not.toThrow();
  });

  describe("status", () => {
    it("rejeita status fora do enum pending|accepted|revoked", () => {
      const invitation = new Invitation(
        buildProps({ status: "invalido" as unknown as "pending" }),
      );
      const messages = getValidationMessages(() => invitation.validate());

      expect(messages).toContain("invitation.status.in");
    });

    it("aceita accepted e revoked", () => {
      expect(() =>
        new Invitation(buildProps({ status: "accepted" })).validate(),
      ).not.toThrow();
      expect(() =>
        new Invitation(buildProps({ status: "revoked" })).validate(),
      ).not.toThrow();
    });
  });

  describe("role", () => {
    it("rejeita role fora do enum member", () => {
      const invitation = new Invitation(
        buildProps({ role: "owner" as unknown as "member" }),
      );
      const messages = getValidationMessages(() => invitation.validate());

      expect(messages).toContain("invitation.role.in");
    });
  });

  describe("boardId/invitedById", () => {
    it("rejeita boardId que nao e uuid", () => {
      const invitation = new Invitation(buildProps({ boardId: "invalido" }));
      const messages = getValidationMessages(() => invitation.validate());

      expect(messages).toContain("invitation.boardId.uuid");
    });

    it("rejeita invitedById vazio", () => {
      const invitation = new Invitation(buildProps({ invitedById: "" }));
      const messages = getValidationMessages(() => invitation.validate());

      expect(messages).toContain("invitation.invitedById.required");
    });
  });
});
