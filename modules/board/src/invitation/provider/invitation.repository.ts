import { Invitation } from "../model";

export interface CreateInvitationInput {
  boardId: string;
  email: string;
  token: string;
  invitedById: string;
}

export interface InvitationRepository {
  findByToken(token: string): Promise<Invitation | null>;
  findPendingByBoardAndEmail(
    boardId: string,
    email: string,
  ): Promise<Invitation | null>;
  create(input: CreateInvitationInput): Promise<Invitation>;
  markAccepted(id: string): Promise<void>;
  listPendingByBoardId(boardId: string): Promise<Invitation[]>;
}
