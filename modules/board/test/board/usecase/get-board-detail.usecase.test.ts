import { NotFoundError } from "@taskboard/shared";
import { List } from "../../../src/list/model";
import { Card } from "../../../src/card/model";
import { Label } from "../../../src/label/model";
import { ChecklistItem } from "../../../src/checklist-item/model";
import { Membership } from "../../../src/membership/model";
import { GetBoardDetail } from "../../../src/board/usecase/get-board-detail.usecase";
import {
  FakeBoardRepository,
  FakeMembershipRepository,
  FakeListRepository,
  FakeCardRepository,
  FakeCardLabelRepository,
  FakeLabelRepository,
  FakeChecklistItemRepository,
  FakeCardAssigneeRepository,
  FakeMemberDirectory,
} from "../../mock";

const OWNER_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const OTHER_USER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";

function setup() {
  const memberships: Membership[] = [];
  const boardRepository = new FakeBoardRepository(memberships);
  const membershipRepository = new FakeMembershipRepository(memberships);
  const listRepository = new FakeListRepository();
  const cardRepository = new FakeCardRepository();
  const cardLabelRepository = new FakeCardLabelRepository();
  const labelRepository = new FakeLabelRepository();
  const checklistItemRepository = new FakeChecklistItemRepository();
  const cardAssigneeRepository = new FakeCardAssigneeRepository();
  const memberDirectory = new FakeMemberDirectory();
  const useCase = new GetBoardDetail(
    boardRepository,
    membershipRepository,
    listRepository,
    cardRepository,
    cardLabelRepository,
    labelRepository,
    checklistItemRepository,
    cardAssigneeRepository,
    memberDirectory,
  );
  return {
    boardRepository,
    membershipRepository,
    listRepository,
    cardRepository,
    cardLabelRepository,
    labelRepository,
    checklistItemRepository,
    cardAssigneeRepository,
    memberDirectory,
    useCase,
  };
}

describe("GetBoardDetail", () => {
  it("retorna o quadro com listas e cartoes ordenados por position", async () => {
    const { boardRepository, listRepository, cardRepository, useCase } =
      setup();
    const { board } = await boardRepository.createWithOwnerMembership({
      name: "Quadro",
      ownerId: OWNER_ID,
    });

    const listB = new List({
      boardId: board.id,
      title: "Lista B",
      position: 1,
    });
    const listA = new List({
      boardId: board.id,
      title: "Lista A",
      position: 0,
    });
    await listRepository.create(listB);
    await listRepository.create(listA);

    const cardB = new Card({
      listId: listA.id,
      title: "Cartao B",
      position: 1,
    });
    const cardA = new Card({
      listId: listA.id,
      title: "Cartao A",
      position: 0,
    });
    await cardRepository.create(cardB);
    await cardRepository.create(cardA);

    const { board: detail } = await useCase.execute({
      boardId: board.id,
      requesterId: OWNER_ID,
    });

    expect(detail.lists.map((list) => list.title)).toEqual([
      "Lista A",
      "Lista B",
    ]);
    expect(detail.lists[0].cards.map((card) => card.title)).toEqual([
      "Cartao A",
      "Cartao B",
    ]);
    expect(detail.lists[1].cards).toEqual([]);
  });

  it("inclui as labels do cartao no detalhe do quadro", async () => {
    const {
      boardRepository,
      listRepository,
      cardRepository,
      cardLabelRepository,
      labelRepository,
      useCase,
    } = setup();
    const { board } = await boardRepository.createWithOwnerMembership({
      name: "Quadro",
      ownerId: OWNER_ID,
    });
    const list = await listRepository.create(
      new List({ boardId: board.id, title: "Lista", position: 0 }),
    );
    const card = await cardRepository.create(
      new Card({ listId: list.id, title: "Cartao", position: 0 }),
    );
    const label = await labelRepository.create(
      new Label({ boardId: board.id, name: "Backend", color: "blue" }),
    );
    await cardLabelRepository.assign(card.id, label.id);

    const { board: detail } = await useCase.execute({
      boardId: board.id,
      requesterId: OWNER_ID,
    });

    expect(detail.lists[0].cards[0].labels).toEqual([
      { id: label.id, name: "Backend", color: "blue" },
    ]);
  });

  it("inclui dueDate, assignees e checklist do cartao no detalhe do quadro", async () => {
    const {
      boardRepository,
      listRepository,
      cardRepository,
      checklistItemRepository,
      cardAssigneeRepository,
      memberDirectory,
      useCase,
    } = setup();
    const { board } = await boardRepository.createWithOwnerMembership({
      name: "Quadro",
      ownerId: OWNER_ID,
    });
    const list = await listRepository.create(
      new List({ boardId: board.id, title: "Lista", position: 0 }),
    );
    const dueDate = new Date("2026-08-01T00:00:00.000Z");
    const card = await cardRepository.create(
      new Card({ listId: list.id, title: "Cartao", position: 0, dueDate }),
    );
    memberDirectory.users.push({
      id: OTHER_USER_ID,
      name: "Fulano",
      email: "fulano@example.com",
    });
    await cardAssigneeRepository.assign(card.id, OTHER_USER_ID);
    await checklistItemRepository.create(
      new ChecklistItem({ cardId: card.id, text: "Item", position: 0 }),
    );

    const { board: detail } = await useCase.execute({
      boardId: board.id,
      requesterId: OWNER_ID,
    });

    const cardDetail = detail.lists[0].cards[0];
    expect(cardDetail.dueDate).toBe(dueDate.toISOString());
    expect(cardDetail.assignees).toEqual([
      { id: OTHER_USER_ID, name: "Fulano" },
    ]);
    expect(cardDetail.checklist).toEqual([
      { id: expect.any(String), text: "Item", done: false, position: 0 },
    ]);
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
    expect(found.lists).toEqual([]);
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
});
