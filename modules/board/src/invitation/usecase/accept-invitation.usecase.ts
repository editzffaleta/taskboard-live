import { DomainError, NotFoundError, RequiredRule, UseCase, UuidRule, Validator } from "@taskboard/shared";
import { InvitationRepository } from "../provider";
import { MemberDirectory, MembershipRepository } from "../../membership/provider";

export interface AcceptInvitationIn {
  token: string;
  currentUserId: string;
}

export interface AcceptInvitationMemberOut {
  id: string;
  name: string;
  email: string;
  role: "member";
}

export interface AcceptInvitationOut {
  boardId: string;
  memberCreated: boolean;
  member: AcceptInvitationMemberOut;
}

export class AcceptInvitation
  implements UseCase<AcceptInvitationIn, AcceptInvitationOut>
{
  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly membershipRepository: MembershipRepository,
    private readonly memberDirectory: MemberDirectory,
  ) {}

  async execute(input: AcceptInvitationIn): Promise<AcceptInvitationOut> {
    Validator.validate([
      {
        code: "acceptInvitation.token",
        value: input.token,
        rules: [new RequiredRule()],
      },
      {
        code: "acceptInvitation.currentUserId",
        value: input.currentUserId,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);

    const invitation = await this.invitationRepository.findByToken(
      input.token,
    );

    if (!invitation) {
      throw new NotFoundError("invitation.not.found");
    }

    if (invitation.status !== "pending") {
      throw new DomainError("invitation.invalid.status", 409);
    }

    const currentUser = await this.memberDirectory.findById(
      input.currentUserId,
    );

    if (
      !currentUser ||
      currentUser.email.toLowerCase() !== invitation.email.toLowerCase()
    ) {
      throw new DomainError("invitation.email.mismatch", 403);
    }

    const existingMembership = await this.membershipRepository.findByBoardAndUser(
      invitation.boardId,
      currentUser.id,
    );

    let memberCreated = false;

    if (!existingMembership) {
      await this.membershipRepository.create(
        invitation.boardId,
        currentUser.id,
        "member",
      );
      memberCreated = true;
    }

    await this.invitationRepository.markAccepted(invitation.id);

    return {
      boardId: invitation.boardId,
      memberCreated,
      member: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: "member",
      },
    };
  }
}
