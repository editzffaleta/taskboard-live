import { NotFoundError } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import { GetBoard } from "../../../src/board/usecase/get-board.usecase";
import { FakeBoardRepository, FakeMembershipRepository } from "../../mock";

const OWNER_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const OTHER_USER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";

function setup() {
  const memberships: Membership[] = [];
  const boardRepository = new FakeBoardRepository(memberships);
  const membershipRepository = new FakeMembershipRepository(memberships);
  const useCase = new GetBoard(boardRepository, membershipRepository);
  return { boardRepository, membershipRepository, useCase };
}

describe("GetBoard", () => {
  it("permite o owner ver o detalhe do quadro", async () => {
    const { boardRepository, useCase } = setup();
    const { board } = await boardRepository.createWithOwnerMembership({
      name: "Quadro",
      ownerId: OWNER_ID,
    });

    const { board: found } = await useCase.execute({
      boardId: board.id,
      requesterId: OWNER_ID,
    });

    expect(found.id).toBe(board.id);
  });

  it("permite um member ver o detalhe do quadro", async () => {
    const { boardRepository, membershipRepository, useCase } = setup();
    const { board } = await boardRepository.createWithOwnerMembership({
      name: "Quadro",
      ownerId: OWNER_ID,
    });
    await membershipRepository.create(board.id, OTHER_USER_ID, "member");

    const { board: found } = await useCase.execute({
      boardId: board.id,
      requesterId: OTHER_USER_ID,
    });

    expect(found.id).toBe(board.id);
  });

  it("rejeita com 404 quando o requester nao e membro (sem vazar existencia)", async () => {
    const { boardRepository, useCase } = setup();
    const { board } = await boardRepository.createWithOwnerMembership({
      name: "Quadro",
      ownerId: OWNER_ID,
    });

    await expect(
      useCase.execute({ boardId: board.id, requesterId: OTHER_USER_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      useCase.execute({ boardId: board.id, requesterId: OTHER_USER_ID }),
    ).rejects.toMatchObject({ message: "board.not.found", statusCode: 404 });
  });

  it("rejeita quando o quadro nao existe", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        boardId: "9c858901-8a57-4791-81fe-4c455b099bc9",
        requesterId: OWNER_ID,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita quando existe membership mas o quadro foi removido", async () => {
    const { membershipRepository, useCase } = setup();
    const boardId = "9c858901-8a57-4791-81fe-4c455b099bc9";
    await membershipRepository.create(boardId, OWNER_ID, "owner");

    await expect(
      useCase.execute({ boardId, requesterId: OWNER_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
