import { Membership } from "../../../src/membership/model";
import { ListMyBoards } from "../../../src/board/usecase/list-my-boards.usecase";
import { FakeBoardRepository, FakeMembershipRepository } from "../../mock";

const OWNER_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const OTHER_USER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";

function setup() {
  const memberships: Membership[] = [];
  const boardRepository = new FakeBoardRepository(memberships);
  const membershipRepository = new FakeMembershipRepository(memberships);
  const useCase = new ListMyBoards(boardRepository, membershipRepository);
  return { boardRepository, membershipRepository, useCase };
}

describe("ListMyBoards", () => {
  it("lista apenas os quadros nos quais o usuario e membro", async () => {
    const { boardRepository, useCase } = setup();
    const { board: ownedBoard } = await boardRepository.createWithOwnerMembership({
      name: "Quadro do usuario",
      ownerId: OWNER_ID,
    });
    await boardRepository.createWithOwnerMembership({
      name: "Quadro de outro usuario",
      ownerId: OTHER_USER_ID,
    });

    const { boards } = await useCase.execute({ userId: OWNER_ID });

    expect(boards).toHaveLength(1);
    expect(boards[0].id).toBe(ownedBoard.id);
  });

  it("retorna lista vazia quando o usuario nao e membro de nenhum quadro", async () => {
    const { useCase } = setup();

    const { boards } = await useCase.execute({ userId: OWNER_ID });

    expect(boards).toEqual([]);
  });
});
