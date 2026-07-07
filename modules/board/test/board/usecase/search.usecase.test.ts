import { Card } from "../../../src/card/model";
import { List } from "../../../src/list/model";
import { Membership } from "../../../src/membership/model";
import { Search } from "../../../src/board/usecase/search.usecase";
import {
  FakeBoardRepository,
  FakeCardRepository,
  FakeListRepository,
  FakeMembershipRepository,
} from "../../mock";

const OWNER_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const OTHER_USER_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";

function setup() {
  const memberships: Membership[] = [];
  const boardRepository = new FakeBoardRepository(memberships);
  const membershipRepository = new FakeMembershipRepository(memberships);
  const listRepository = new FakeListRepository();
  const cardRepository = new FakeCardRepository();
  const useCase = new Search(boardRepository, cardRepository, membershipRepository);
  return {
    boardRepository,
    membershipRepository,
    listRepository,
    cardRepository,
    useCase,
  };
}

describe("Search", () => {
  it("retorna vazio quando o usuario nao tem quadros", async () => {
    const { useCase } = setup();

    const result = await useCase.execute({
      requesterId: OWNER_ID,
      query: "sprint",
    });

    expect(result).toEqual({ boards: [], cards: [] });
  });

  it("retorna vazio quando a query tem menos de 2 caracteres, sem consultar repositorios", async () => {
    const { boardRepository, cardRepository, useCase } = setup();
    const searchByIdsSpy = jest.spyOn(boardRepository, "searchByIds");
    const searchByBoardIdsSpy = jest.spyOn(cardRepository, "searchByBoardIds");

    const result = await useCase.execute({ requesterId: OWNER_ID, query: "a" });

    expect(result).toEqual({ boards: [], cards: [] });
    expect(searchByIdsSpy).not.toHaveBeenCalled();
    expect(searchByBoardIdsSpy).not.toHaveBeenCalled();
  });

  it("retorna quadro que casa com a query, escopado ao usuario", async () => {
    const { boardRepository, useCase } = setup();

    const { board } = await boardRepository.createWithOwnerMembership({
      name: "Sprint 12",
      ownerId: OWNER_ID,
    });
    await boardRepository.createWithOwnerMembership({
      name: "Roadmap",
      ownerId: OWNER_ID,
    });

    const result = await useCase.execute({
      requesterId: OWNER_ID,
      query: "sprint",
    });

    expect(result.boards).toHaveLength(1);
    expect(result.boards[0]).toEqual({ id: board.id, name: "Sprint 12" });
  });

  it("retorna cartao que casa com a query e hidrata boardName/listTitle", async () => {
    const { boardRepository, listRepository, cardRepository, useCase } =
      setup();

    const { board } = await boardRepository.createWithOwnerMembership({
      name: "Quadro Principal",
      ownerId: OWNER_ID,
    });
    const list = await listRepository.create(
      new List({ boardId: board.id, title: "A Fazer", position: 0 }),
    );
    cardRepository.registerListBoard(list.id, board.id, {
      boardName: board.name,
      listTitle: list.title,
    });
    const card = await cardRepository.create(
      new Card({
        listId: list.id,
        title: "Revisar presença online",
        position: 0,
      }),
    );

    const result = await useCase.execute({
      requesterId: OWNER_ID,
      query: "presença",
    });

    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]).toEqual({
      id: card.id,
      title: card.title,
      boardId: board.id,
      boardName: "Quadro Principal",
      listTitle: "A Fazer",
    });
  });

  it("exclui cartao arquivado dos resultados", async () => {
    const { boardRepository, listRepository, cardRepository, useCase } =
      setup();

    const { board } = await boardRepository.createWithOwnerMembership({
      name: "Quadro Principal",
      ownerId: OWNER_ID,
    });
    const list = await listRepository.create(
      new List({ boardId: board.id, title: "A Fazer", position: 0 }),
    );
    cardRepository.registerListBoard(list.id, board.id, {
      boardName: board.name,
      listTitle: list.title,
    });
    const card = await cardRepository.create(
      new Card({ listId: list.id, title: "Cartao Arquivado", position: 0 }),
    );
    await cardRepository.archive(card.id, new Date());

    const result = await useCase.execute({
      requesterId: OWNER_ID,
      query: "arquivado",
    });

    expect(result.cards).toEqual([]);
  });

  it("exclui quadro de que o usuario nao e membro, mesmo que o nome case", async () => {
    const { boardRepository, useCase } = setup();

    await boardRepository.createWithOwnerMembership({
      name: "Sprint do Outro",
      ownerId: OTHER_USER_ID,
    });

    const result = await useCase.execute({
      requesterId: OWNER_ID,
      query: "sprint",
    });

    expect(result).toEqual({ boards: [], cards: [] });
  });
});
