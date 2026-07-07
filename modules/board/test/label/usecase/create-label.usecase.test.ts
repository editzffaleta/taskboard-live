import { DomainError, ValidationException } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import { CreateLabel } from "../../../src/label/usecase/create-label.usecase";
import { FakeLabelRepository, FakeMembershipRepository } from "../../mock";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const MEMBER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";
const OTHER_USER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";

function setup() {
  const memberships: Membership[] = [
    new Membership({ boardId: BOARD_ID, userId: MEMBER_ID, role: "owner" }),
  ];
  const labelRepository = new FakeLabelRepository();
  const membershipRepository = new FakeMembershipRepository(memberships);
  const useCase = new CreateLabel(labelRepository, membershipRepository);
  return { labelRepository, membershipRepository, useCase };
}

describe("CreateLabel", () => {
  it("cria a etiqueta associada ao quadro", async () => {
    const { labelRepository, useCase } = setup();

    const { label } = await useCase.execute({
      boardId: BOARD_ID,
      requesterId: MEMBER_ID,
      name: "Backend",
      color: "blue",
    });

    expect(label.name).toBe("Backend");
    expect(label.color).toBe("blue");
    expect(label.boardId).toBe(BOARD_ID);
    expect(labelRepository.labels).toHaveLength(1);
  });

  it("rejeita quando o requester nao e membro do quadro", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        requesterId: OTHER_USER_ID,
        name: "Backend",
        color: "blue",
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("rejeita cor fora da paleta", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        requesterId: MEMBER_ID,
        name: "Backend",
        // @ts-expect-error cor invalida propositalmente para o teste
        color: "black",
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it("rejeita nome vazio", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        requesterId: MEMBER_ID,
        name: "",
        color: "blue",
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
