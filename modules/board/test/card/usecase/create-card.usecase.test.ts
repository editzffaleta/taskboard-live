import { DomainError, NotFoundError, ValidationException } from "@taskboard/shared";
import { List } from "../../../src/list/model";
import { Membership } from "../../../src/membership/model";
import { CreateCard } from "../../../src/card/usecase/create-card.usecase";
import {
  FakeCardRepository,
  FakeListRepository,
  FakeMembershipRepository,
} from "../../mock";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const OTHER_BOARD_ID = "1b3f4a2e-8a4a-4a2a-9c3f-1a2b3c4d5e6f";
const MEMBER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";
const OTHER_USER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";

function setup() {
  const memberships: Membership[] = [
    new Membership({ boardId: BOARD_ID, userId: MEMBER_ID, role: "owner" }),
  ];
  const cardRepository = new FakeCardRepository();
  const listRepository = new FakeListRepository();
  const membershipRepository = new FakeMembershipRepository(memberships);
  const useCase = new CreateCard(
    cardRepository,
    listRepository,
    membershipRepository,
  );
  return { cardRepository, listRepository, membershipRepository, useCase };
}

async function createList(listRepository: FakeListRepository, boardId = BOARD_ID) {
  return listRepository.create(
    new List({ boardId, title: "A Fazer", position: 0 }),
  );
}

describe("CreateCard", () => {
  it("cria o cartao com position no fim da lista", async () => {
    const { cardRepository, listRepository, useCase } = setup();
    const list = await createList(listRepository);

    const { card: first } = await useCase.execute({
      boardId: BOARD_ID,
      requesterId: MEMBER_ID,
      listId: list.id,
      title: "Primeiro",
    });
    const { card: second } = await useCase.execute({
      boardId: BOARD_ID,
      requesterId: MEMBER_ID,
      listId: list.id,
      title: "Segundo",
    });

    expect(first.position).toBe(0);
    expect(second.position).toBe(1);
    expect(cardRepository.cards).toHaveLength(2);
  });

  it("rejeita quando o requester nao e membro do quadro", async () => {
    const { listRepository, useCase } = setup();
    const list = await createList(listRepository);

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        requesterId: OTHER_USER_ID,
        listId: list.id,
        title: "Primeiro",
      }),
    ).rejects.toMatchObject({ message: "board.member.required", statusCode: 403 });
    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        requesterId: OTHER_USER_ID,
        listId: list.id,
        title: "Primeiro",
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("rejeita quando a lista nao existe", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        requesterId: MEMBER_ID,
        listId: "e22fa8be-9843-4769-930a-62d4f26e5e1e",
        title: "Primeiro",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita quando a lista pertence a outro quadro", async () => {
    const { listRepository, useCase } = setup();
    const list = await createList(listRepository, OTHER_BOARD_ID);

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        requesterId: MEMBER_ID,
        listId: list.id,
        title: "Primeiro",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita entrada invalida (titulo vazio)", async () => {
    const { listRepository, useCase } = setup();
    const list = await createList(listRepository);

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        requesterId: MEMBER_ID,
        listId: list.id,
        title: "",
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
