import { DomainError, NotFoundError } from "@taskboard/shared";
import { Card } from "../../../src/card/model";
import { List } from "../../../src/list/model";
import { Membership } from "../../../src/membership/model";
import { ArchiveList } from "../../../src/list/usecase/archive-list.usecase";
import { RestoreList } from "../../../src/list/usecase/restore-list.usecase";
import {
  FakeCardRepository,
  FakeListRepository,
  FakeMembershipRepository,
} from "../../mock";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const MEMBER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";
const OTHER_USER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";

function setup() {
  const memberships: Membership[] = [
    new Membership({ boardId: BOARD_ID, userId: MEMBER_ID, role: "owner" }),
  ];
  const listRepository = new FakeListRepository();
  const cardRepository = new FakeCardRepository();
  const membershipRepository = new FakeMembershipRepository(memberships);
  const archiveUseCase = new ArchiveList(listRepository, membershipRepository);
  const restoreUseCase = new RestoreList(listRepository, membershipRepository);
  return { listRepository, cardRepository, archiveUseCase, restoreUseCase };
}

describe("ArchiveList", () => {
  it("membro arquiva a lista sem propagar archivedAt aos cartoes", async () => {
    const { listRepository, cardRepository, archiveUseCase } = setup();
    const list = await listRepository.create(
      new List({ boardId: BOARD_ID, title: "A Fazer", position: 0 }),
    );
    const card = await cardRepository.create(
      new Card({ listId: list.id, title: "Cartao", position: 0 }),
    );

    const result = await archiveUseCase.execute({
      listId: list.id,
      requesterId: MEMBER_ID,
    });

    expect(result).toEqual({ boardId: BOARD_ID, listId: list.id });
    const archived = await listRepository.findById(list.id);
    expect(archived?.archivedAt).not.toBeNull();

    const untouchedCard = await cardRepository.findById(card.id);
    expect(untouchedCard?.archivedAt).toBeNull();
  });

  it("nao-membro recebe 403", async () => {
    const { listRepository, archiveUseCase } = setup();
    const list = await listRepository.create(
      new List({ boardId: BOARD_ID, title: "A Fazer", position: 0 }),
    );

    await expect(
      archiveUseCase.execute({ listId: list.id, requesterId: OTHER_USER_ID }),
    ).rejects.toMatchObject({ message: "board.member.required", statusCode: 403 });
  });

  it("arquivar lista ja arquivada rejeita com list.already.archived", async () => {
    const { listRepository, archiveUseCase } = setup();
    const list = await listRepository.create(
      new List({ boardId: BOARD_ID, title: "A Fazer", position: 0 }),
    );

    await archiveUseCase.execute({ listId: list.id, requesterId: MEMBER_ID });

    await expect(
      archiveUseCase.execute({ listId: list.id, requesterId: MEMBER_ID }),
    ).rejects.toMatchObject({
      message: "list.already.archived",
      statusCode: 400,
    });
  });

  it("rejeita quando a lista nao existe", async () => {
    const { archiveUseCase } = setup();

    await expect(
      archiveUseCase.execute({
        listId: "e22fa8be-9843-4769-930a-62d4f26e5e1e",
        requesterId: MEMBER_ID,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("RestoreList", () => {
  it("membro restaura uma lista arquivada", async () => {
    const { listRepository, archiveUseCase, restoreUseCase } = setup();
    const list = await listRepository.create(
      new List({ boardId: BOARD_ID, title: "A Fazer", position: 0 }),
    );

    await archiveUseCase.execute({ listId: list.id, requesterId: MEMBER_ID });

    const result = await restoreUseCase.execute({
      listId: list.id,
      requesterId: MEMBER_ID,
    });

    expect(result.list.archivedAt).toBeNull();
  });

  it("restaurar lista nao-arquivada rejeita com list.not.archived", async () => {
    const { listRepository, restoreUseCase } = setup();
    const list = await listRepository.create(
      new List({ boardId: BOARD_ID, title: "A Fazer", position: 0 }),
    );

    await expect(
      restoreUseCase.execute({ listId: list.id, requesterId: MEMBER_ID }),
    ).rejects.toMatchObject({ message: "list.not.archived", statusCode: 400 });
  });

  it("nao-membro recebe 403 ao restaurar", async () => {
    const { listRepository, archiveUseCase, restoreUseCase } = setup();
    const list = await listRepository.create(
      new List({ boardId: BOARD_ID, title: "A Fazer", position: 0 }),
    );
    await archiveUseCase.execute({ listId: list.id, requesterId: MEMBER_ID });

    await expect(
      restoreUseCase.execute({ listId: list.id, requesterId: OTHER_USER_ID }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
