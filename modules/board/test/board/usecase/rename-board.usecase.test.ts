import { DomainError, NotFoundError, ValidationException } from "@taskboard/shared";
import { Board } from "../../../src/board/model";
import { Membership } from "../../../src/membership/model";
import { RenameBoard } from "../../../src/board/usecase/rename-board.usecase";
import { FakeBoardRepository, FakeMembershipRepository } from "../../mock";

const OWNER_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const OTHER_USER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";

function setup() {
  const memberships: Membership[] = [];
  const boardRepository = new FakeBoardRepository(memberships);
  const membershipRepository = new FakeMembershipRepository(memberships);
  const useCase = new RenameBoard(boardRepository, membershipRepository);
  return { boardRepository, membershipRepository, useCase };
}

describe("RenameBoard", () => {
  it("permite o owner renomear o quadro", async () => {
    const { boardRepository, useCase } = setup();
    const { board } = await boardRepository.createWithOwnerMembership({
      name: "Nome antigo",
      ownerId: OWNER_ID,
    });

    const { board: renamed } = await useCase.execute({
      boardId: board.id,
      requesterId: OWNER_ID,
      name: "Nome novo",
    });

    expect(renamed.name).toBe("Nome novo");
  });

  it("rejeita quando o requester nao e owner", async () => {
    const { boardRepository, useCase } = setup();
    const { board } = await boardRepository.createWithOwnerMembership({
      name: "Nome antigo",
      ownerId: OWNER_ID,
    });

    await expect(
      useCase.execute({
        boardId: board.id,
        requesterId: OTHER_USER_ID,
        name: "Nome novo",
      }),
    ).rejects.toMatchObject({
      message: "board.owner.required",
      statusCode: 403,
    });
    await expect(
      useCase.execute({
        boardId: board.id,
        requesterId: OTHER_USER_ID,
        name: "Nome novo",
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("rejeita quando o quadro nao existe", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        boardId: "9c858901-8a57-4791-81fe-4c455b099bc9",
        requesterId: OWNER_ID,
        name: "Nome novo",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita entrada invalida (nome vazio)", async () => {
    const { boardRepository, useCase } = setup();
    const { board } = await boardRepository.createWithOwnerMembership({
      name: "Nome antigo",
      ownerId: OWNER_ID,
    });

    await expect(
      useCase.execute({ boardId: board.id, requesterId: OWNER_ID, name: "" }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
