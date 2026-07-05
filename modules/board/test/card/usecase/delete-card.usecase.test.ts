import { DomainError, NotFoundError, ValidationException } from "@taskboard/shared";
import { Card } from "../../../src/card/model";
import { List } from "../../../src/list/model";
import { Membership } from "../../../src/membership/model";
import { DeleteCard } from "../../../src/card/usecase/delete-card.usecase";
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
  const cardRepository = new FakeCardRepository();
  const listRepository = new FakeListRepository();
  const membershipRepository = new FakeMembershipRepository(memberships);
  const useCase = new DeleteCard(
    cardRepository,
    listRepository,
    membershipRepository,
  );
  return { cardRepository, listRepository, membershipRepository, useCase };
}

async function createListWithCards(
  cardRepository: FakeCardRepository,
  listRepository: FakeListRepository,
) {
  const list = await listRepository.create(
    new List({ boardId: BOARD_ID, title: "A Fazer", position: 0 }),
  );
  const first = await cardRepository.create(
    new Card({ listId: list.id, title: "A", position: 0 }),
  );
  const second = await cardRepository.create(
    new Card({ listId: list.id, title: "B", position: 1 }),
  );
  const third = await cardRepository.create(
    new Card({ listId: list.id, title: "C", position: 2 }),
  );
  return { list, first, second, third };
}

describe("DeleteCard", () => {
  it("remove o cartao e renormaliza as posicoes remanescentes", async () => {
    const { cardRepository, listRepository, useCase } = setup();
    const { list, first, second, third } = await createListWithCards(
      cardRepository,
      listRepository,
    );

    await useCase.execute({
      boardId: BOARD_ID,
      cardId: second.id,
      requesterId: MEMBER_ID,
    });

    const remaining = await cardRepository.findAllByListId(list.id);
    expect(remaining).toHaveLength(2);
    expect(remaining.map((c) => c.id)).toEqual([first.id, third.id]);
    expect(remaining.map((c) => c.position)).toEqual([0, 1]);
  });

  it("rejeita quando o requester nao e membro do quadro", async () => {
    const { cardRepository, listRepository, useCase } = setup();
    const { first } = await createListWithCards(cardRepository, listRepository);

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: first.id,
        requesterId: OTHER_USER_ID,
      }),
    ).rejects.toMatchObject({ message: "board.member.required", statusCode: 403 });
    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: first.id,
        requesterId: OTHER_USER_ID,
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("rejeita quando o cartao nao existe", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: "e22fa8be-9843-4769-930a-62d4f26e5e1e",
        requesterId: MEMBER_ID,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita entrada invalida (cardId nao-uuid)", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: "nao-e-um-uuid",
        requesterId: MEMBER_ID,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
