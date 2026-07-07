import { NotFoundError, ValidationException } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import { BoardTemplate } from "../../../src/template/board-template.types";
import {
  CreateBoardFromTemplate,
  CreateBoardFromTemplateIn,
} from "../../../src/template/usecase/create-board-from-template.usecase";
import { FakeBoardRepository } from "../../mock";

const OWNER_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

const TEST_TEMPLATES: BoardTemplate[] = [
  {
    id: "modelo-a",
    name: "Modelo A",
    description: "Descricao do modelo A",
    category: "Teste",
    color: "blue",
    lists: [
      {
        title: "Coluna 1",
        cards: [{ title: "Cartao 1" }, { title: "Cartao 2" }],
      },
      {
        title: "Coluna 2",
        cards: [],
      },
    ],
  },
  {
    id: "modelo-b",
    name: "Modelo B",
    description: "Descricao do modelo B",
    category: "Teste",
    color: "green",
    lists: [
      {
        title: "Unica coluna",
        cards: [{ title: "Cartao unico" }],
      },
    ],
  },
];

function buildInput(
  overrides: Partial<CreateBoardFromTemplateIn> = {},
): CreateBoardFromTemplateIn {
  return {
    templateId: "modelo-a",
    ownerId: OWNER_ID,
    ...overrides,
  };
}

describe("CreateBoardFromTemplate", () => {
  it("cria o board, o owner, as listas e os cartoes do modelo", async () => {
    const memberships: Membership[] = [];
    const boardRepository = new FakeBoardRepository(memberships);
    const useCase = new CreateBoardFromTemplate(
      boardRepository,
      TEST_TEMPLATES,
    );

    const { board } = await useCase.execute(buildInput());

    expect(boardRepository.boards).toHaveLength(1);
    expect(board.name).toBe("Modelo A");
    expect(board.ownerId).toBe(OWNER_ID);

    expect(memberships).toHaveLength(1);
    expect(memberships[0].boardId).toBe(board.id);
    expect(memberships[0].userId).toBe(OWNER_ID);
    expect(memberships[0].role).toBe("owner");

    expect(boardRepository.lists).toHaveLength(2);
    expect(boardRepository.lists.map((list) => list.title)).toEqual([
      "Coluna 1",
      "Coluna 2",
    ]);
    expect(boardRepository.cards).toHaveLength(2);
    expect(boardRepository.cards.map((card) => card.title)).toEqual([
      "Cartao 1",
      "Cartao 2",
    ]);
  });

  it("usa o nome do template quando name nao e informado", async () => {
    const boardRepository = new FakeBoardRepository();
    const useCase = new CreateBoardFromTemplate(
      boardRepository,
      TEST_TEMPLATES,
    );

    const { board } = await useCase.execute(
      buildInput({ templateId: "modelo-b" }),
    );

    expect(board.name).toBe("Modelo B");
  });

  it("usa o nome informado quando presente", async () => {
    const boardRepository = new FakeBoardRepository();
    const useCase = new CreateBoardFromTemplate(
      boardRepository,
      TEST_TEMPLATES,
    );

    const { board } = await useCase.execute(
      buildInput({ name: "Meu quadro customizado" }),
    );

    expect(board.name).toBe("Meu quadro customizado");
  });

  it("rejeita templateId inexistente", async () => {
    const boardRepository = new FakeBoardRepository();
    const useCase = new CreateBoardFromTemplate(
      boardRepository,
      TEST_TEMPLATES,
    );

    await expect(
      useCase.execute(buildInput({ templateId: "nao-existe" })),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(boardRepository.boards).toHaveLength(0);
  });

  it("rejeita ownerId invalido", async () => {
    const boardRepository = new FakeBoardRepository();
    const useCase = new CreateBoardFromTemplate(
      boardRepository,
      TEST_TEMPLATES,
    );

    await expect(
      useCase.execute(buildInput({ ownerId: "nao-e-um-uuid" })),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(boardRepository.boards).toHaveLength(0);
  });

  it("rejeita templateId ausente", async () => {
    const boardRepository = new FakeBoardRepository();
    const useCase = new CreateBoardFromTemplate(
      boardRepository,
      TEST_TEMPLATES,
    );

    await expect(
      useCase.execute(buildInput({ templateId: "" })),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(boardRepository.boards).toHaveLength(0);
  });
});
