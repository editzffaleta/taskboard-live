import { DomainError, NotFoundError, ValidationException } from "@taskboard/shared";
import { Card } from "../../../src/card/model";
import { List } from "../../../src/list/model";
import { Membership } from "../../../src/membership/model";
import { MoveCard } from "../../../src/card/usecase/move-card.usecase";
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
  const useCase = new MoveCard(
    cardRepository,
    listRepository,
    membershipRepository,
  );
  return { cardRepository, listRepository, membershipRepository, useCase };
}

async function createBoardWithTwoLists(
  cardRepository: FakeCardRepository,
  listRepository: FakeListRepository,
) {
  const listA = await listRepository.create(
    new List({ boardId: BOARD_ID, title: "A Fazer", position: 0 }),
  );
  const listB = await listRepository.create(
    new List({ boardId: BOARD_ID, title: "Em Progresso", position: 1 }),
  );

  const cardA1 = await cardRepository.create(
    new Card({ listId: listA.id, title: "A1", position: 0 }),
  );
  const cardA2 = await cardRepository.create(
    new Card({ listId: listA.id, title: "A2", position: 1 }),
  );
  const cardA3 = await cardRepository.create(
    new Card({ listId: listA.id, title: "A3", position: 2 }),
  );
  const cardB1 = await cardRepository.create(
    new Card({ listId: listB.id, title: "B1", position: 0 }),
  );

  return { listA, listB, cardA1, cardA2, cardA3, cardB1 };
}

describe("MoveCard", () => {
  it("reordena dentro da mesma lista sem duplicar ou lacunar posicoes", async () => {
    const { cardRepository, listRepository, useCase } = setup();
    const { listA, cardA1, cardA3 } = await createBoardWithTwoLists(
      cardRepository,
      listRepository,
    );

    const { card, fromListId, toListId, position } = await useCase.execute({
      boardId: BOARD_ID,
      cardId: cardA3.id,
      requesterId: MEMBER_ID,
      toListId: listA.id,
      position: 0,
    });

    expect(fromListId).toBe(listA.id);
    expect(toListId).toBe(listA.id);
    expect(position).toBe(0);
    expect(card.listId).toBe(listA.id);

    const persisted = await cardRepository.findAllByListId(listA.id);
    const positions = persisted.map((c) => c.position).sort((a, b) => a - b);
    expect(positions).toEqual([0, 1, 2]);
    expect(persisted.find((c) => c.id === cardA3.id)?.position).toBe(0);
    expect(persisted.find((c) => c.id === cardA1.id)?.position).toBe(1);
  });

  it("move para outra lista do mesmo quadro, renormalizando origem e destino", async () => {
    const { cardRepository, listRepository, useCase } = setup();
    const { listA, listB, cardA2, cardB1 } = await createBoardWithTwoLists(
      cardRepository,
      listRepository,
    );

    const { card, fromListId, toListId, position } = await useCase.execute({
      boardId: BOARD_ID,
      cardId: cardA2.id,
      requesterId: MEMBER_ID,
      toListId: listB.id,
      position: 0,
    });

    expect(fromListId).toBe(listA.id);
    expect(toListId).toBe(listB.id);
    expect(position).toBe(0);
    expect(card.listId).toBe(listB.id);

    const originRemaining = await cardRepository.findAllByListId(listA.id);
    expect(originRemaining).toHaveLength(2);
    expect(originRemaining.map((c) => c.position)).toEqual([0, 1]);

    const destination = await cardRepository.findAllByListId(listB.id);
    expect(destination).toHaveLength(2);
    expect(destination.map((c) => c.position)).toEqual([0, 1]);
    expect(destination[0].id).toBe(cardA2.id);
    expect(destination[1].id).toBe(cardB1.id);
  });

  it("rejeita mover para lista de outro quadro", async () => {
    const { cardRepository, listRepository, useCase } = setup();
    const { cardA1 } = await createBoardWithTwoLists(cardRepository, listRepository);
    const listOtherBoard = await listRepository.create(
      new List({ boardId: OTHER_BOARD_ID, title: "Fora", position: 0 }),
    );

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: cardA1.id,
        requesterId: MEMBER_ID,
        toListId: listOtherBoard.id,
        position: 0,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    const persisted = await cardRepository.findById(cardA1.id);
    expect(persisted?.listId).toBe(cardA1.listId);
  });

  it("rejeita quando o requester nao e membro do quadro", async () => {
    const { cardRepository, listRepository, useCase } = setup();
    const { listA, cardA1 } = await createBoardWithTwoLists(
      cardRepository,
      listRepository,
    );

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: cardA1.id,
        requesterId: OTHER_USER_ID,
        toListId: listA.id,
        position: 0,
      }),
    ).rejects.toMatchObject({ message: "board.member.required", statusCode: 403 });
    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: cardA1.id,
        requesterId: OTHER_USER_ID,
        toListId: listA.id,
        position: 0,
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("rejeita quando o cartao nao existe", async () => {
    const { listRepository, useCase } = setup();
    const listA = await listRepository.create(
      new List({ boardId: BOARD_ID, title: "A Fazer", position: 0 }),
    );

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: "e22fa8be-9843-4769-930a-62d4f26e5e1e",
        requesterId: MEMBER_ID,
        toListId: listA.id,
        position: 0,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita entrada invalida (position negativa)", async () => {
    const { cardRepository, listRepository, useCase } = setup();
    const { listA, cardA1 } = await createBoardWithTwoLists(
      cardRepository,
      listRepository,
    );

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: cardA1.id,
        requesterId: MEMBER_ID,
        toListId: listA.id,
        position: -1,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
