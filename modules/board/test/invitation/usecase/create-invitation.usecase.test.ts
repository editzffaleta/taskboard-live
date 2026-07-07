import { DomainError, ValidationException } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import { CreateInvitation } from "../../../src/invitation/usecase/create-invitation.usecase";
import {
  FakeInvitationRepository,
  FakeMemberDirectory,
  FakeMembershipRepository,
} from "../../mock";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const OWNER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";
const MEMBER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";
const KNOWN_USER_ID = "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed";

function setup() {
  const memberships: Membership[] = [
    new Membership({ boardId: BOARD_ID, userId: OWNER_ID, role: "owner" }),
    new Membership({ boardId: BOARD_ID, userId: MEMBER_ID, role: "member" }),
  ];
  const membershipRepository = new FakeMembershipRepository(memberships);
  const memberDirectory = new FakeMemberDirectory([
    { id: OWNER_ID, name: "Owner", email: "owner@example.com" },
    { id: MEMBER_ID, name: "Membro", email: "membro@example.com" },
    { id: KNOWN_USER_ID, name: "Conhecido", email: "conhecido@example.com" },
  ]);
  const invitationRepository = new FakeInvitationRepository();
  const useCase = new CreateInvitation(
    invitationRepository,
    membershipRepository,
    memberDirectory,
  );
  return { invitationRepository, membershipRepository, memberDirectory, useCase };
}

describe("CreateInvitation", () => {
  it("owner convida um e-mail novo (sem conta) e cria o convite pending", async () => {
    const { useCase, invitationRepository } = setup();

    const { invitation } = await useCase.execute({
      boardId: BOARD_ID,
      requesterId: OWNER_ID,
      email: "novo@example.com",
    });

    expect(invitation.status).toBe("pending");
    expect(invitation.email).toBe("novo@example.com");
    expect(invitation.token).toBeTruthy();
    expect(invitationRepository.invitations).toHaveLength(1);
  });

  it("owner reconvida e-mail com pending existente: retorna o mesmo token, sem duplicar", async () => {
    const { useCase, invitationRepository } = setup();

    const first = await useCase.execute({
      boardId: BOARD_ID,
      requesterId: OWNER_ID,
      email: "novo@example.com",
    });

    const second = await useCase.execute({
      boardId: BOARD_ID,
      requesterId: OWNER_ID,
      email: "novo@example.com",
    });

    expect(second.invitation.token).toBe(first.invitation.token);
    expect(invitationRepository.invitations).toHaveLength(1);
  });

  it("owner convida e-mail que ja e membro do quadro: 409", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        requesterId: OWNER_ID,
        email: "membro@example.com",
      }),
    ).rejects.toMatchObject({
      message: "invitation.already.member",
      statusCode: 409,
    });
  });

  it("permite convidar por link um e-mail que ja tem conta mas nao e membro", async () => {
    const { useCase, invitationRepository } = setup();

    const { invitation } = await useCase.execute({
      boardId: BOARD_ID,
      requesterId: OWNER_ID,
      email: "conhecido@example.com",
    });

    expect(invitation.status).toBe("pending");
    expect(invitationRepository.invitations).toHaveLength(1);
  });

  it("nao-owner tentando criar convite: 403", async () => {
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

  it("rejeita entrada invalida (email vazio)", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({ boardId: BOARD_ID, requesterId: OWNER_ID, email: "" }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
