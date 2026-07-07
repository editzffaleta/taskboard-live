import { Board, Membership } from "@taskboard/board";
import { DomainError } from "@taskboard/shared";
import { DeleteAccount } from "../../../src/user/usecase/delete-account.usecase";
import { RegisterUser } from "../../../src/user/usecase/register-user.usecase";
import {
  FakeBoardRepository,
  FakeCryptoProvider,
  FakeMembershipRepository,
  FakeUserRepository,
} from "../../mock";

async function registerUser(
  userRepository: FakeUserRepository,
  cryptoProvider: FakeCryptoProvider,
  email: string,
): Promise<string> {
  const registerUser = new RegisterUser(userRepository, cryptoProvider);
  await registerUser.execute({
    name: "Usuario Teste",
    email,
    password: "Str0ng!Passw0rd",
  });
  return userRepository.users.find((u) => u.email === email)!.id;
}

describe("DeleteAccount", () => {
  it("exclui o usuario sem nenhum quadro", async () => {
    const userRepository = new FakeUserRepository();
    const cryptoProvider = new FakeCryptoProvider();
    const boardRepository = new FakeBoardRepository();
    const membershipRepository = new FakeMembershipRepository();
    const userId = await registerUser(
      userRepository,
      cryptoProvider,
      "sem.quadro@example.com",
    );
    const useCase = new DeleteAccount(
      userRepository,
      boardRepository,
      membershipRepository,
    );

    await useCase.execute({ userId });

    expect(userRepository.users).toHaveLength(0);
  });

  it("exclui a conta e os quadros-owner solo (cascata)", async () => {
    const userRepository = new FakeUserRepository();
    const cryptoProvider = new FakeCryptoProvider();
    const userId = await registerUser(
      userRepository,
      cryptoProvider,
      "owner.solo@example.com",
    );
    const board = new Board({ name: "Quadro Solo", ownerId: userId });
    const membership = new Membership({
      boardId: board.id,
      userId,
      role: "owner",
    });
    const boardRepository = new FakeBoardRepository();
    boardRepository.boards.push(board);
    const membershipRepository = new FakeMembershipRepository([membership]);
    const useCase = new DeleteAccount(
      userRepository,
      boardRepository,
      membershipRepository,
    );

    await useCase.execute({ userId });

    expect(userRepository.users).toHaveLength(0);
    expect(boardRepository.boards).toHaveLength(0);
  });

  it("bloqueia a exclusao quando o usuario e owner de quadro com outros membros, sem excluir nada", async () => {
    const userRepository = new FakeUserRepository();
    const cryptoProvider = new FakeCryptoProvider();
    const userId = await registerUser(
      userRepository,
      cryptoProvider,
      "owner.compartilhado@example.com",
    );
    const otherUserId = "9b1e2f3a-4c5d-4e6f-8a9b-0c1d2e3f4a5b";
    const board = new Board({ name: "Quadro Compartilhado", ownerId: userId });
    const ownerMembership = new Membership({
      boardId: board.id,
      userId,
      role: "owner",
    });
    const otherMembership = new Membership({
      boardId: board.id,
      userId: otherUserId,
      role: "member",
    });
    const boardRepository = new FakeBoardRepository();
    boardRepository.boards.push(board);
    const membershipRepository = new FakeMembershipRepository([
      ownerMembership,
      otherMembership,
    ]);
    const useCase = new DeleteAccount(
      userRepository,
      boardRepository,
      membershipRepository,
    );

    await expect(useCase.execute({ userId })).rejects.toMatchObject({
      message: "account.delete.owner.boards.blocked",
      statusCode: 409,
    });
    await expect(useCase.execute({ userId })).rejects.toBeInstanceOf(
      DomainError,
    );
    expect(userRepository.users).toHaveLength(1);
    expect(boardRepository.boards).toHaveLength(1);
    expect(membershipRepository.memberships).toHaveLength(2);
  });

  it("remove memberships de quadros de terceiros e mantem quadros solo excluidos", async () => {
    const userRepository = new FakeUserRepository();
    const cryptoProvider = new FakeCryptoProvider();
    const userId = await registerUser(
      userRepository,
      cryptoProvider,
      "misto@example.com",
    );
    const soloBoard = new Board({ name: "Quadro Solo", ownerId: userId });
    const soloMembership = new Membership({
      boardId: soloBoard.id,
      userId,
      role: "owner",
    });
    const thirdPartyBoardId = "d3f6b3a2-2f0a-4e1b-9a3c-9d8b2c1a4e5f";
    const thirdPartyMembership = new Membership({
      boardId: thirdPartyBoardId,
      userId,
      role: "member",
    });
    const boardRepository = new FakeBoardRepository();
    boardRepository.boards.push(soloBoard);
    const membershipRepository = new FakeMembershipRepository([
      soloMembership,
      thirdPartyMembership,
    ]);
    const useCase = new DeleteAccount(
      userRepository,
      boardRepository,
      membershipRepository,
    );

    await useCase.execute({ userId });

    expect(userRepository.users).toHaveLength(0);
    expect(boardRepository.boards).toHaveLength(0);
    // A membership do quadro de terceiro foi explicitamente removida (o usuario
    // "sai" do quadro). A membership do quadro solo permanece no fake porque
    // `BoardRepository.delete` (Prisma real com onDelete: Cascade em BoardMember)
    // e quem cuida da cascata de membership nesse caso - o fake nao simula essa
    // cascata, so remove da lista de `boards`.
    expect(membershipRepository.memberships).toHaveLength(1);
    expect(membershipRepository.memberships[0].boardId).toBe(soloBoard.id);
  });
});
