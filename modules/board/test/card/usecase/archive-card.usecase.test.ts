import { DomainError, NotFoundError } from "@taskboard/shared";
import { Card } from "../../../src/card/model";
import { List } from "../../../src/list/model";
import { Membership } from "../../../src/membership/model";
import { ArchiveCard } from "../../../src/card/usecase/archive-card.usecase";
import { RestoreCard } from "../../../src/card/usecase/restore-card.usecase";
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
  const archiveUseCase = new ArchiveCard(
    cardRepository,
    listRepository,
    membershipRepository,
  );
  const restoreUseCase = new RestoreCard(
    cardRepository,
    listRepository,
    membershipRepository,
  );
  return { cardRepository, listRepository, archiveUseCase, restoreUseCase };
}

async function createCard(
  cardRepository: FakeCardRepository,
  listRepository: FakeListRepository,
) {
  const list = await listRepository.create(
    new List({ boardId: BOARD_ID, title: "A Fazer", position: 0 }),
  );
  const card = await cardRepository.create(
    new Card({ listId: list.id, title: "Cartao", position: 0 }),
  );
  return { list, card };
}

describe("ArchiveCard", () => {
  it("membro arquiva um cartao com sucesso", async () => {
    const { cardRepository, listRepository, archiveUseCase } = setup();
    const { card } = await createCard(cardRepository, listRepository);

    const result = await archiveUseCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      requesterId: MEMBER_ID,
    });

    expect(result).toEqual({ boardId: BOARD_ID, listId: card.listId, cardId: card.id });
    const archived = await cardRepository.findById(card.id);
    expect(archived?.archivedAt).not.toBeNull();
  });

  it("nao-membro recebe 403", async () => {
    const { cardRepository, listRepository, archiveUseCase } = setup();
    const { card } = await createCard(cardRepository, listRepository);

    await expect(
      archiveUseCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        requesterId: OTHER_USER_ID,
      }),
    ).rejects.toMatchObject({ message: "board.member.required", statusCode: 403 });
  });

  it("arquivar cartao ja arquivado rejeita com card.already.archived", async () => {
    const { cardRepository, listRepository, archiveUseCase } = setup();
    const { card } = await createCard(cardRepository, listRepository);

    await archiveUseCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      requesterId: MEMBER_ID,
    });

    await expect(
      archiveUseCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        requesterId: MEMBER_ID,
      }),
    ).rejects.toMatchObject({ message: "card.already.archived", statusCode: 400 });
  });

  it("rejeita quando o cartao nao existe", async () => {
    const { archiveUseCase } = setup();

    await expect(
      archiveUseCase.execute({
        boardId: BOARD_ID,
        cardId: "e22fa8be-9843-4769-930a-62d4f26e5e1e",
        requesterId: MEMBER_ID,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("RestoreCard", () => {
  it("membro restaura um cartao arquivado", async () => {
    const { cardRepository, listRepository, archiveUseCase, restoreUseCase } =
      setup();
    const { card } = await createCard(cardRepository, listRepository);

    await archiveUseCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      requesterId: MEMBER_ID,
    });

    const result = await restoreUseCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      requesterId: MEMBER_ID,
    });

    expect(result.card.archivedAt).toBeNull();
    const restored = await cardRepository.findById(card.id);
    expect(restored?.archivedAt).toBeNull();
  });

  it("restaurar cartao nao-arquivado rejeita com card.not.archived", async () => {
    const { cardRepository, listRepository, restoreUseCase } = setup();
    const { card } = await createCard(cardRepository, listRepository);

    await expect(
      restoreUseCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        requesterId: MEMBER_ID,
      }),
    ).rejects.toMatchObject({ message: "card.not.archived", statusCode: 400 });
  });

  it("nao-membro recebe 403 ao restaurar", async () => {
    const { cardRepository, listRepository, archiveUseCase, restoreUseCase } =
      setup();
    const { card } = await createCard(cardRepository, listRepository);
    await archiveUseCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      requesterId: MEMBER_ID,
    });

    await expect(
      restoreUseCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        requesterId: OTHER_USER_ID,
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
