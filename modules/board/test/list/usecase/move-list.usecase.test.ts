import { DomainError, NotFoundError, ValidationException } from "@taskboard/shared";
import { List } from "../../../src/list/model";
import { Membership } from "../../../src/membership/model";
import { MoveList } from "../../../src/list/usecase/move-list.usecase";
import { FakeListRepository, FakeMembershipRepository } from "../../mock";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const MEMBER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";
const OTHER_USER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";

async function createLists(listRepository: FakeListRepository) {
  const first = await listRepository.create(
    new List({ boardId: BOARD_ID, title: "A", position: 0 }),
  );
  const second = await listRepository.create(
    new List({ boardId: BOARD_ID, title: "B", position: 1 }),
  );
  const third = await listRepository.create(
    new List({ boardId: BOARD_ID, title: "C", position: 2 }),
  );
  return { first, second, third };
}

function setup() {
  const memberships: Membership[] = [
    new Membership({ boardId: BOARD_ID, userId: MEMBER_ID, role: "owner" }),
  ];
  const listRepository = new FakeListRepository();
  const membershipRepository = new FakeMembershipRepository(memberships);
  const useCase = new MoveList(listRepository, membershipRepository);
  return { listRepository, membershipRepository, useCase };
}

describe("MoveList", () => {
  it("reordena as listas do quadro sem duplicar ou lacunar posicoes", async () => {
    const { listRepository, useCase } = setup();
    const { first, third } = await createLists(listRepository);

    const { lists } = await useCase.execute({
      listId: third.id,
      requesterId: MEMBER_ID,
      position: 0,
    });

    const positions = lists.map((list) => list.position).sort((a, b) => a - b);
    expect(positions).toEqual([0, 1, 2]);

    const ordered = [...lists].sort((a, b) => a.position - b.position);
    expect(ordered[0].id).toBe(third.id);
    expect(ordered[1].id).toBe(first.id);

    const persisted = await listRepository.findAllByBoardId(BOARD_ID);
    const persistedPositions = persisted
      .map((list) => list.position)
      .sort((a, b) => a - b);
    expect(persistedPositions).toEqual([0, 1, 2]);
  });

  it("rejeita quando o requester nao e membro do quadro", async () => {
    const { listRepository, useCase } = setup();
    const { first } = await createLists(listRepository);

    await expect(
      useCase.execute({
        listId: first.id,
        requesterId: OTHER_USER_ID,
        position: 1,
      }),
    ).rejects.toMatchObject({
      message: "board.member.required",
      statusCode: 403,
    });
    await expect(
      useCase.execute({
        listId: first.id,
        requesterId: OTHER_USER_ID,
        position: 1,
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("rejeita quando a lista nao existe", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        listId: "e22fa8be-9843-4769-930a-62d4f26e5e1e",
        requesterId: MEMBER_ID,
        position: 0,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita entrada invalida (position negativa)", async () => {
    const { listRepository, useCase } = setup();
    const { first } = await createLists(listRepository);

    await expect(
      useCase.execute({
        listId: first.id,
        requesterId: MEMBER_ID,
        position: -1,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
