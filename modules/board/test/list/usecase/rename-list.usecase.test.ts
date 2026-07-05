import { DomainError, NotFoundError, ValidationException } from "@taskboard/shared";
import { List } from "../../../src/list/model";
import { Membership } from "../../../src/membership/model";
import { RenameList } from "../../../src/list/usecase/rename-list.usecase";
import { FakeListRepository, FakeMembershipRepository } from "../../mock";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const MEMBER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";
const OTHER_USER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";

function setup() {
  const memberships: Membership[] = [
    new Membership({ boardId: BOARD_ID, userId: MEMBER_ID, role: "owner" }),
  ];
  const listRepository = new FakeListRepository();
  const membershipRepository = new FakeMembershipRepository(memberships);
  const useCase = new RenameList(listRepository, membershipRepository);
  return { listRepository, membershipRepository, useCase };
}

describe("RenameList", () => {
  it("permite o membro renomear a lista", async () => {
    const { listRepository, useCase } = setup();
    const list = await listRepository.create(
      new List({ boardId: BOARD_ID, title: "A fazer", position: 0 }),
    );

    const { list: renamed } = await useCase.execute({
      listId: list.id,
      requesterId: MEMBER_ID,
      title: "Backlog",
    });

    expect(renamed.title).toBe("Backlog");
  });

  it("rejeita quando o requester nao e membro do quadro", async () => {
    const { listRepository, useCase } = setup();
    const list = await listRepository.create(
      new List({ boardId: BOARD_ID, title: "A fazer", position: 0 }),
    );

    await expect(
      useCase.execute({
        listId: list.id,
        requesterId: OTHER_USER_ID,
        title: "Backlog",
      }),
    ).rejects.toMatchObject({
      message: "board.member.required",
      statusCode: 403,
    });
    await expect(
      useCase.execute({
        listId: list.id,
        requesterId: OTHER_USER_ID,
        title: "Backlog",
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("rejeita quando a lista nao existe", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        listId: "e22fa8be-9843-4769-930a-62d4f26e5e1e",
        requesterId: MEMBER_ID,
        title: "Backlog",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita entrada invalida (titulo vazio)", async () => {
    const { listRepository, useCase } = setup();
    const list = await listRepository.create(
      new List({ boardId: BOARD_ID, title: "A fazer", position: 0 }),
    );

    await expect(
      useCase.execute({ listId: list.id, requesterId: MEMBER_ID, title: "" }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
