import { Invitation } from "../../src/invitation/model";
import {
  CreateInvitationInput,
  InvitationRepository,
} from "../../src/invitation/provider";

export class FakeInvitationRepository implements InvitationRepository {
  constructor(readonly invitations: Invitation[] = []) {}

  async findByToken(token: string): Promise<Invitation | null> {
    return this.invitations.find((item) => item.token === token) ?? null;
  }

  async findPendingByBoardAndEmail(
    boardId: string,
    email: string,
  ): Promise<Invitation | null> {
    return (
      this.invitations.find(
        (item) =>
          item.boardId === boardId &&
          item.email === email &&
          item.status === "pending",
      ) ?? null
    );
  }

  async create(input: CreateInvitationInput): Promise<Invitation> {
    const invitation = new Invitation({
      boardId: input.boardId,
      email: input.email,
      token: input.token,
      invitedById: input.invitedById,
      role: "member",
      status: "pending",
    });
    invitation.validate();
    this.invitations.push(invitation);
    return invitation;
  }

  async markAccepted(id: string): Promise<void> {
    const index = this.invitations.findIndex((item) => item.id === id);
    if (index >= 0) {
      this.invitations[index] = this.invitations[index].clone({
        status: "accepted",
      });
    }
  }

  async listPendingByBoardId(boardId: string): Promise<Invitation[]> {
    return this.invitations.filter(
      (item) => item.boardId === boardId && item.status === "pending",
    );
  }
}
