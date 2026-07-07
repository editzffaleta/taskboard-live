import { NotFoundError, RequiredRule, UseCase, Validator } from "@taskboard/shared";
import { InvitationRepository } from "../provider";
import { MemberDirectory } from "../../membership/provider";
import { BoardRepository } from "../../board/provider";

export interface GetInvitationPreviewIn {
  token: string;
}

export interface GetInvitationPreviewOut {
  boardName: string;
  invitedByName: string;
  email: string;
  status: "pending" | "accepted" | "revoked";
}

export class GetInvitationPreview
  implements UseCase<GetInvitationPreviewIn, GetInvitationPreviewOut>
{
  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly boardRepository: BoardRepository,
    private readonly memberDirectory: MemberDirectory,
  ) {}

  async execute(
    input: GetInvitationPreviewIn,
  ): Promise<GetInvitationPreviewOut> {
    Validator.validate([
      {
        code: "getInvitationPreview.token",
        value: input.token,
        rules: [new RequiredRule()],
      },
    ]);

    const invitation = await this.invitationRepository.findByToken(
      input.token,
    );

    if (!invitation) {
      throw new NotFoundError("invitation.not.found");
    }

    const board = await this.boardRepository.findById(invitation.boardId);
    const invitedBy = await this.memberDirectory.findById(
      invitation.invitedById,
    );

    return {
      boardName: board?.name ?? "",
      invitedByName: invitedBy?.name ?? "",
      email: invitation.email,
      status: invitation.status,
    };
  }
}
