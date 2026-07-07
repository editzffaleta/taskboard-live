import { DomainError, NotFoundError, ValidationException } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import { Label } from "../../../src/label/model";
import { UpdateLabel } from "../../../src/label/usecase/update-label.usecase";
import { FakeLabelRepository, FakeMembershipRepository } from "../../mock";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const OTHER_BOARD_ID = "1b3f4a2e-8a4a-4a2a-9c3f-1a2b3c4d5e6f";
const MEMBER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";
const OTHER_USER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";

function setup() {
  const memberships: Membership[] = [
    new Membership({ boardId: BOARD_ID, userId: MEMBER_ID, role: "owner" }),
  ];
  const labelRepository = new FakeLabelRepository();
  const membershipRepository = new FakeMembershipRepository(memberships);
  const useCase = new UpdateLabel(labelRepository, membershipRepository);
  return { labelRepository, membershipRepository, useCase };
}

describe("UpdateLabel", () => {
  it("renomeia e recolora a etiqueta", async () => {
    const { labelRepository, useCase } = setup();
    const label = await labelRepository.create(
      new Label({ boardId: BOARD_ID, name: "Backend", color: "blue" }),
    );

    const { label: updated } = await useCase.execute({
      boardId: BOARD_ID,
      labelId: label.id,
      requesterId: MEMBER_ID,
      name: "Design",
      color: "pink",
    });

    expect(updated.name).toBe("Design");
    expect(updated.color).toBe("pink");
  });

  it("rejeita quando a etiqueta nao existe", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        labelId: OTHER_USER_ID,
        requesterId: MEMBER_ID,
        name: "Design",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita quando a etiqueta pertence a outro quadro", async () => {
    const { labelRepository, useCase } = setup();
    const label = await labelRepository.create(
      new Label({ boardId: OTHER_BOARD_ID, name: "Backend", color: "blue" }),
    );

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        labelId: label.id,
        requesterId: MEMBER_ID,
        name: "Design",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita quando o requester nao e membro do quadro", async () => {
    const { labelRepository, useCase } = setup();
    const label = await labelRepository.create(
      new Label({ boardId: BOARD_ID, name: "Backend", color: "blue" }),
    );

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        labelId: label.id,
        requesterId: OTHER_USER_ID,
        name: "Design",
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("rejeita cor fora da paleta", async () => {
    const { labelRepository, useCase } = setup();
    const label = await labelRepository.create(
      new Label({ boardId: BOARD_ID, name: "Backend", color: "blue" }),
    );

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        labelId: label.id,
        requesterId: MEMBER_ID,
        // @ts-expect-error cor invalida propositalmente para o teste
        color: "black",
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
