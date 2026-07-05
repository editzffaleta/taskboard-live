import { DomainError, NotFoundError, ValidationException } from "@taskboard/shared";
import { Card } from "../../../src/card/model";
import { List } from "../../../src/list/model";
import { Membership } from "../../../src/membership/model";
import { EditCard } from "../../../src/card/usecase/edit-card.usecase";
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
  const useCase = new EditCard(
    cardRepository,
    listRepository,
    membershipRepository,
  );
  return { cardRepository, listRepository, membershipRepository, useCase };
}

async function setupCard(
  cardRepository: FakeCardRepository,
  listRepository: FakeListRepository,
) {
  const list = await listRepository.create(
    new List({ boardId: BOARD_ID, title: "A Fazer", position: 0 }),
  );
  const card = await cardRepository.create(
    new Card({ listId: list.id, title: "Original", position: 0 }),
  );
  return { list, card };
}

describe("EditCard", () => {
  it("atualiza title e description sem alterar listId/position", async () => {
    const { cardRepository, listRepository, useCase } = setup();
    const { card, list } = await setupCard(cardRepository, listRepository);

    const { card: edited } = await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      requesterId: MEMBER_ID,
      title: "Atualizado",
      description: "Detalhe",
    });

    expect(edited.title).toBe("Atualizado");
    expect(edited.description).toBe("Detalhe");
    expect(edited.listId).toBe(list.id);
    expect(edited.position).toBe(0);
  });

  it("rejeita quando o requester nao e membro do quadro", async () => {
    const { cardRepository, listRepository, useCase } = setup();
    const { card } = await setupCard(cardRepository, listRepository);

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        requesterId: OTHER_USER_ID,
        title: "Tentativa",
      }),
    ).rejects.toMatchObject({ message: "board.member.required", statusCode: 403 });
    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        requesterId: OTHER_USER_ID,
        title: "Tentativa",
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
        title: "Tentativa",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita entrada invalida (titulo vazio)", async () => {
    const { cardRepository, listRepository, useCase } = setup();
    const { card } = await setupCard(cardRepository, listRepository);

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        requesterId: MEMBER_ID,
        title: "",
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
