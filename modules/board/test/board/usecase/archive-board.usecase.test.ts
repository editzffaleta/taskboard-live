import { DomainError, NotFoundError } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import { ArchiveBoard } from "../../../src/board/usecase/archive-board.usecase";
import { RestoreBoard } from "../../../src/board/usecase/restore-board.usecase";
import { FakeBoardRepository, FakeMembershipRepository } from "../../mock";

const OWNER_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const MEMBER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";
const OTHER_USER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";

function setup() {
  const memberships: Membership[] = [];
  const boardRepository = new FakeBoardRepository(memberships);
  const membershipRepository = new FakeMembershipRepository(memberships);
  const archiveUseCase = new ArchiveBoard(boardRepository, membershipRepository);
  const restoreUseCase = new RestoreBoard(boardRepository, membershipRepository);
  return { boardRepository, membershipRepository, archiveUseCase, restoreUseCase };
}

describe("ArchiveBoard", () => {
  it("owner arquiva o proprio quadro", async () => {
    const { boardRepository, archiveUseCase } = setup();
    const { board } = await boardRepository.createWithOwnerMembership({
      name: "Quadro",
      ownerId: OWNER_ID,
    });

    await archiveUseCase.execute({ boardId: board.id, requesterId: OWNER_ID });

    const archived = await boardRepository.findById(board.id);
    expect(archived?.archivedAt).not.toBeNull();
  });

  it("membro que nao e owner recebe board.owner.required", async () => {
    const { boardRepository, membershipRepository, archiveUseCase } = setup();
    const { board } = await boardRepository.createWithOwnerMembership({
      name: "Quadro",
      ownerId: OWNER_ID,
    });
    await membershipRepository.create(board.id, MEMBER_ID, "member");

    await expect(
      archiveUseCase.execute({ boardId: board.id, requesterId: MEMBER_ID }),
    ).rejects.toMatchObject({
      message: "board.owner.required",
      statusCode: 403,
    });
  });

  it("arquivar quadro ja arquivado rejeita com board.already.archived", async () => {
    const { boardRepository, archiveUseCase } = setup();
    const { board } = await boardRepository.createWithOwnerMembership({
      name: "Quadro",
      ownerId: OWNER_ID,
    });

    await archiveUseCase.execute({ boardId: board.id, requesterId: OWNER_ID });

    await expect(
      archiveUseCase.execute({ boardId: board.id, requesterId: OWNER_ID }),
    ).rejects.toMatchObject({
      message: "board.already.archived",
      statusCode: 400,
    });
  });

  it("rejeita quando o quadro nao existe", async () => {
    const { archiveUseCase } = setup();

    await expect(
      archiveUseCase.execute({
        boardId: OTHER_USER_ID,
        requesterId: OWNER_ID,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("RestoreBoard", () => {
  it("owner restaura um quadro arquivado", async () => {
    const { boardRepository, archiveUseCase, restoreUseCase } = setup();
    const { board } = await boardRepository.createWithOwnerMembership({
      name: "Quadro",
      ownerId: OWNER_ID,
    });
    await archiveUseCase.execute({ boardId: board.id, requesterId: OWNER_ID });

    await restoreUseCase.execute({ boardId: board.id, requesterId: OWNER_ID });

    const restored = await boardRepository.findById(board.id);
    expect(restored?.archivedAt).toBeNull();
  });

  it("restaurar quadro nao-arquivado rejeita com board.not.archived", async () => {
    const { boardRepository, restoreUseCase } = setup();
    const { board } = await boardRepository.createWithOwnerMembership({
      name: "Quadro",
      ownerId: OWNER_ID,
    });

    await expect(
      restoreUseCase.execute({ boardId: board.id, requesterId: OWNER_ID }),
    ).rejects.toMatchObject({
      message: "board.not.archived",
      statusCode: 400,
    });
  });

  it("nao-owner recebe 403 ao restaurar", async () => {
    const { boardRepository, membershipRepository, archiveUseCase, restoreUseCase } =
      setup();
    const { board } = await boardRepository.createWithOwnerMembership({
      name: "Quadro",
      ownerId: OWNER_ID,
    });
    await membershipRepository.create(board.id, MEMBER_ID, "member");
    await archiveUseCase.execute({ boardId: board.id, requesterId: OWNER_ID });

    await expect(
      restoreUseCase.execute({ boardId: board.id, requesterId: MEMBER_ID }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
