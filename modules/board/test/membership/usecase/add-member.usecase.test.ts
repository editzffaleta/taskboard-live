import { DomainError, NotFoundError, ValidationException } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import { AddMember } from "../../../src/membership/usecase/add-member.usecase";
import { FakeMemberDirectory, FakeMembershipRepository } from "../../mock";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const OWNER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";
const MEMBER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";
const NEW_USER_ID = "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed";

function setup() {
  const memberships: Membership[] = [
    new Membership({ boardId: BOARD_ID, userId: OWNER_ID, role: "owner" }),
    new Membership({ boardId: BOARD_ID, userId: MEMBER_ID, role: "member" }),
  ];
  const membershipRepository = new FakeMembershipRepository(memberships);
  const memberDirectory = new FakeMemberDirectory([
    { id: OWNER_ID, name: "Owner", email: "owner@example.com" },
    { id: MEMBER_ID, name: "Membro", email: "membro@example.com" },
    { id: NEW_USER_ID, name: "Novo Usuario", email: "novo@example.com" },
  ]);
  const useCase = new AddMember(membershipRepository, memberDirectory);
  return { membershipRepository, memberDirectory, useCase };
}

describe("AddMember", () => {
  it("permite o owner adicionar um usuario existente por e-mail", async () => {
    const { useCase, membershipRepository } = setup();

    const { member } = await useCase.execute({
      boardId: BOARD_ID,
      requesterId: OWNER_ID,
      email: "novo@example.com",
    });

    expect(member).toEqual({
      id: NEW_USER_ID,
      name: "Novo Usuario",
      email: "novo@example.com",
      role: "member",
    });
    const created = await membershipRepository.findByBoardAndUser(
      BOARD_ID,
      NEW_USER_ID,
    );
    expect(created?.role).toBe("member");
  });

  it("rejeita quando o requester nao e owner", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        requesterId: MEMBER_ID,
        email: "novo@example.com",
      }),
    ).rejects.toMatchObject({
      message: "board.owner.required",
      statusCode: 403,
    });
  });

  it("rejeita e-mail sem conta correspondente", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        requesterId: OWNER_ID,
        email: "inexistente@example.com",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita e-mail que ja e membro do quadro", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        requesterId: OWNER_ID,
        email: "membro@example.com",
      }),
    ).rejects.toMatchObject({
      message: "board.member.already.exists",
      statusCode: 409,
    });
  });

  it("rejeita entrada invalida (email vazio)", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({ boardId: BOARD_ID, requesterId: OWNER_ID, email: "" }),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it("erros de dominio sao instancias de DomainError", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        requesterId: MEMBER_ID,
        email: "novo@example.com",
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
