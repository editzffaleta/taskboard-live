import { Card } from "../../../src/card/model";
import { List } from "../../../src/list/model";
import { Membership } from "../../../src/membership/model";
import { ListArchivedItems } from "../../../src/board/usecase/list-archived-items.usecase";
import {
  FakeBoardRepository,
  FakeCardRepository,
  FakeListRepository,
  FakeMembershipRepository,
} from "../../mock";

const OWNER_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

function setup() {
  const memberships: Membership[] = [];
  const boardRepository = new FakeBoardRepository(memberships);
  const membershipRepository = new FakeMembershipRepository(memberships);
  const listRepository = new FakeListRepository();
  const cardRepository = new FakeCardRepository();
  const useCase = new ListArchivedItems(
    boardRepository,
    membershipRepository,
    listRepository,
    cardRepository,
  );
  return {
    boardRepository,
    membershipRepository,
    listRepository,
    cardRepository,
    useCase,
  };
}

describe("ListArchivedItems", () => {
  it("retorna cartao arquivado em quadro ativo + quadro inteiro arquivado, sem duplicar itens internos", async () => {
    const {
      boardRepository,
      listRepository,
      cardRepository,
      useCase,
    } = setup();

    const { board: activeBoard } = await boardRepository.createWithOwnerMembership({
      name: "Quadro Ativo",
      ownerId: OWNER_ID,
    });
    const list = await listRepository.create(
      new List({ boardId: activeBoard.id, title: "A Fazer", position: 0 }),
    );
    cardRepository.registerListBoard(list.id, activeBoard.id);
    const card = await cardRepository.create(
      new Card({ listId: list.id, title: "Cartao", position: 0 }),
    );
    await cardRepository.archive(card.id, new Date());

    const secondList = await listRepository.create(
      new List({ boardId: activeBoard.id, title: "Feito", position: 1 }),
    );
    await listRepository.archive(secondList.id, new Date());

    const { board: archivedBoard } = await boardRepository.createWithOwnerMembership({
      name: "Quadro Arquivado",
      ownerId: OWNER_ID,
    });
    await boardRepository.archive(archivedBoard.id, new Date());
    const archivedBoardList = await listRepository.create(
      new List({ boardId: archivedBoard.id, title: "Interna", position: 0 }),
    );
    cardRepository.registerListBoard(archivedBoardList.id, archivedBoard.id);
    await cardRepository.create(
      new Card({ listId: archivedBoardList.id, title: "Cartao Interno", position: 0 }),
    );

    const result = await useCase.execute({ requesterId: OWNER_ID });

    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]).toMatchObject({
      id: card.id,
      boardId: activeBoard.id,
      boardName: "Quadro Ativo",
      listId: list.id,
      listTitle: "A Fazer",
    });

    expect(result.lists).toHaveLength(1);
    expect(result.lists[0]).toMatchObject({
      id: secondList.id,
      boardId: activeBoard.id,
      boardName: "Quadro Ativo",
    });

    expect(result.boards).toHaveLength(1);
    expect(result.boards[0]).toMatchObject({
      id: archivedBoard.id,
      name: "Quadro Arquivado",
    });
  });

  it("retorna vazio quando o usuario nao tem quadros", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({ requesterId: OWNER_ID });

    expect(result).toEqual({ cards: [], lists: [], boards: [] });
  });
});
