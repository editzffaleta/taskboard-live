import { randomBytes } from "crypto";
import { DomainError, RequiredRule, UseCase, UuidRule, Validator } from "@taskboard/shared";
import { Invitation } from "../model";
import { InvitationRepository } from "../provider";
import { MemberDirectory, MembershipRepository } from "../../membership/provider";

export interface CreateInvitationIn {
  boardId: string;
  requesterId: string;
  email: string;
}

export interface CreateInvitationOut {
  invitation: Invitation;
}

export class CreateInvitation
  implements UseCase<CreateInvitationIn, CreateInvitationOut>
{
  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly membershipRepository: MembershipRepository,
    private readonly memberDirectory: MemberDirectory,
  ) {}

  async execute(input: CreateInvitationIn): Promise<CreateInvitationOut> {
    Validator.validate([
      {
        code: "createInvitation.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "createInvitation.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "createInvitation.email",
        value: input.email,
        rules: [new RequiredRule()],
      },
    ]);

    const requesterMembership = await this.membershipRepository.findByBoardAndUser(
      input.boardId,
      input.requesterId,
    );

    if (!requesterMembership || requesterMembership.role !== "owner") {
      throw new DomainError("board.owner.required", 403);
    }

    const existingUser = await this.memberDirectory.findByEmail(input.email);

    if (existingUser) {
      const existingMembership = await this.membershipRepository.findByBoardAndUser(
        input.boardId,
        existingUser.id,
      );

      if (existingMembership) {
        throw new DomainError("invitation.already.member", 409);
      }
    }

    const pending = await this.invitationRepository.findPendingByBoardAndEmail(
      input.boardId,
      input.email,
    );

    if (pending) {
      return { invitation: pending };
    }

    const token = randomBytes(24).toString("base64url");

    const invitation = await this.invitationRepository.create({
      boardId: input.boardId,
      email: input.email,
      token,
      invitedById: input.requesterId,
    });

    return { invitation };
  }
}
