import { RequiredRule, UseCase, UuidRule, Validator } from "@taskboard/shared";
import { BoardRepository } from "../provider";
import { CardRepository } from "../../card/provider";
import { MembershipRepository } from "../../membership/provider";

/**
 * Limite de itens retornados por grupo (`boards`/`cards`), aplicado
 * separadamente a cada coleção — evita que uma consulta genérica devolva
 * centenas de linhas (decisão registrada no `design.md` da change `023`).
 */
export const SEARCH_RESULT_LIMIT = 20;

/**
 * Tamanho mínimo de `query` (após `trim()`) para disparar a busca no banco —
 * abaixo disso, retorna vazio sem round-trip (decisão registrada no
 * `design.md` da change `023`).
 */
const SEARCH_MIN_QUERY_LENGTH = 2;

export interface SearchIn {
  requesterId: string;
  query: string;
}

export interface SearchBoardResult {
  id: string;
  name: string;
}

export interface SearchCardResult {
  id: string;
  title: string;
  boardId: string;
  boardName: string;
  listTitle: string;
}

export interface SearchOut {
  boards: SearchBoardResult[];
  cards: SearchCardResult[];
}

export class Search implements UseCase<SearchIn, SearchOut> {
  constructor(
    private readonly boardRepository: BoardRepository,
    private readonly cardRepository: CardRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: SearchIn): Promise<SearchOut> {
    Validator.validate([
      {
        code: "search.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);

    const query = (input.query ?? "").trim();
    if (query.length < SEARCH_MIN_QUERY_LENGTH) {
      return { boards: [], cards: [] };
    }

    const memberships = await this.membershipRepository.listBoardsByUser(
      input.requesterId,
    );

    if (memberships.length === 0) {
      return { boards: [], cards: [] };
    }

    const boardIds = memberships.map((membership) => membership.boardId);

    const [matchedBoards, matchedCards] = await Promise.all([
      this.boardRepository.searchByIds(boardIds, query, SEARCH_RESULT_LIMIT),
      this.cardRepository.searchByBoardIds(
        boardIds,
        query,
        SEARCH_RESULT_LIMIT,
      ),
    ]);

    const boards: SearchBoardResult[] = matchedBoards.map((board) => ({
      id: board.id,
      name: board.name,
    }));

    const cards: SearchCardResult[] = matchedCards.map((item) => ({
      id: item.card.id,
      title: item.card.title,
      boardId: item.boardId,
      boardName: item.boardName,
      listTitle: item.listTitle,
    }));

    return { boards, cards };
  }
}
