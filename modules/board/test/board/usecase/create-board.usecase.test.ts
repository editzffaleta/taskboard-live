import { ValidationException } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import {
  CreateBoard,
  CreateBoardIn,
} from "../../../src/board/usecase/create-board.usecase";
import { FakeBoardRepository } from "../../mock";

const OWNER_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

function buildInput(overrides: Partial<CreateBoardIn> = {}): CreateBoardIn {
  return {
    name: "Quadro de Marketing",
    ownerId: OWNER_ID,
    ...overrides,
  };
}

describe("CreateBoard", () => {
  it("cria o board e o membership owner na mesma operacao (atomicidade)", async () => {
    const memberships: Membership[] = [];
    const boardRepository = new FakeBoardRepository(memberships);
    const useCase = new CreateBoard(boardRepository);

    const { board } = await useCase.execute(buildInput());

    expect(boardRepository.boards).toHaveLength(1);
    expect(board.name).toBe("Quadro de Marketing");
    expect(board.ownerId).toBe(OWNER_ID);

    expect(memberships).toHaveLength(1);
    expect(memberships[0].boardId).toBe(board.id);
    expect(memberships[0].userId).toBe(OWNER_ID);
    expect(memberships[0].role).toBe("owner");
  });

  it("rejeita nome vazio", async () => {
    const boardRepository = new FakeBoardRepository();
    const useCase = new CreateBoard(boardRepository);

    await expect(
      useCase.execute(buildInput({ name: "" })),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(boardRepository.boards).toHaveLength(0);
  });

  it("rejeita ownerId invalido", async () => {
    const boardRepository = new FakeBoardRepository();
    const useCase = new CreateBoard(boardRepository);

    await expect(
      useCase.execute(buildInput({ ownerId: "nao-e-um-uuid" })),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(boardRepository.boards).toHaveLength(0);
  });
});
