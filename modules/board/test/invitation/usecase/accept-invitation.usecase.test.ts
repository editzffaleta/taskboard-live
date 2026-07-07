import { DomainError, NotFoundError } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import { AcceptInvitation } from "../../../src/invitation/usecase/accept-invitation.usecase";
import {
  FakeInvitationRepository,
  FakeMemberDirectory,
  FakeMembershipRepository,
} from "../../mock";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const OWNER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";
const INVITED_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";
const OTHER_ID = "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed";

function setup() {
  const memberships: Membership[] = [
    new Membership({ boardId: BOARD_ID, userId: OWNER_ID, role: "owner" }),
  ];
  const membershipRepository = new FakeMembershipRepository(memberships);
  const memberDirectory = new FakeMemberDirectory([
    { id: OWNER_ID, name: "Owner", email: "owner@example.com" },
    { id: INVITED_ID, name: "Convidado", email: "convidado@example.com" },
    { id: OTHER_ID, name: "Outro", email: "outro@example.com" },
  ]);
  const invitationRepository = new FakeInvitationRepository();
  const useCase = new AcceptInvitation(
    invitationRepository,
    membershipRepository,
    memberDirectory,
  );
  return { invitationRepository, membershipRepository, memberDirectory, useCase };
}

describe("AcceptInvitation", () => {
  it("aceita com e-mail correspondente: cria BoardMember e marca accepted", async () => {
    const { useCase, invitationRepository, membershipRepository } = setup();

    const invitation = await invitationRepository.create({
      boardId: BOARD_ID,
      email: "CONVIDADO@example.com",
      token: "token-1",
      invitedById: OWNER_ID,
    });

    const result = await useCase.execute({
      token: invitation.token,
      currentUserId: INVITED_ID,
    });

    expect(result.memberCreated).toBe(true);
    expect(result.boardId).toBe(BOARD_ID);
    expect(result.member).toEqual({
      id: INVITED_ID,
      name: "Convidado",
      email: "convidado@example.com",
      role: "member",
    });

    const membership = await membershipRepository.findByBoardAndUser(
      BOARD_ID,
      INVITED_ID,
    );
    expect(membership?.role).toBe("member");

    const updated = await invitationRepository.findByToken(invitation.token);
    expect(updated?.status).toBe("accepted");
  });

  it("e-mail divergente: 403 invitation.email.mismatch, nenhum membro criado", async () => {
    const { useCase, invitationRepository, membershipRepository } = setup();

    const invitation = await invitationRepository.create({
      boardId: BOARD_ID,
      email: "convidado@example.com",
      token: "token-2",
      invitedById: OWNER_ID,
    });

    await expect(
      useCase.execute({ token: invitation.token, currentUserId: OTHER_ID }),
    ).rejects.toMatchObject({
      message: "invitation.email.mismatch",
      statusCode: 403,
    });

    const membership = await membershipRepository.findByBoardAndUser(
      BOARD_ID,
      OTHER_ID,
    );
    expect(membership).toBeNull();

    const stillPending = await invitationRepository.findByToken(
      invitation.token,
    );
    expect(stillPending?.status).toBe("pending");
  });

  it("convite ja accepted/revoked: 409 invitation.invalid.status", async () => {
    const { useCase, invitationRepository } = setup();

    const invitation = await invitationRepository.create({
      boardId: BOARD_ID,
      email: "convidado@example.com",
      token: "token-3",
      invitedById: OWNER_ID,
    });
    await invitationRepository.markAccepted(invitation.id);

    await expect(
      useCase.execute({ token: invitation.token, currentUserId: INVITED_ID }),
    ).rejects.toMatchObject({
      message: "invitation.invalid.status",
      statusCode: 409,
    });
  });

  it("token inexistente: 404", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({ token: "nao-existe", currentUserId: INVITED_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("usuario ja membro aceitando de novo: idempotente, memberCreated false", async () => {
    const { useCase, invitationRepository, membershipRepository } = setup();

    await membershipRepository.create(BOARD_ID, INVITED_ID, "member");

    const invitation = await invitationRepository.create({
      boardId: BOARD_ID,
      email: "convidado@example.com",
      token: "token-4",
      invitedById: OWNER_ID,
    });

    const result = await useCase.execute({
      token: invitation.token,
      currentUserId: INVITED_ID,
    });

    expect(result.memberCreated).toBe(false);
    const updated = await invitationRepository.findByToken(invitation.token);
    expect(updated?.status).toBe("accepted");
  });

  it("erros de dominio sao instancias de DomainError", async () => {
    const { useCase, invitationRepository } = setup();

    const invitation = await invitationRepository.create({
      boardId: BOARD_ID,
      email: "convidado@example.com",
      token: "token-5",
      invitedById: OWNER_ID,
    });

    await expect(
      useCase.execute({ token: invitation.token, currentUserId: OTHER_ID }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
