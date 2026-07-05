import {
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { MemberDirectory, MembershipRepository } from "../provider";

export interface ListMembersIn {
  boardId: string;
  requesterId: string;
}

export interface MemberOut {
  userId: string;
  name: string;
  email: string;
  role: "owner" | "member";
}

export interface ListMembersOut {
  members: MemberOut[];
}

export class ListMembers implements UseCase<ListMembersIn, ListMembersOut> {
  constructor(
    private readonly membershipRepository: MembershipRepository,
    private readonly memberDirectory: MemberDirectory,
  ) {}

  async execute(input: ListMembersIn): Promise<ListMembersOut> {
    Validator.validate([
      {
        code: "listMembers.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "listMembers.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);

    const requesterMembership = await this.membershipRepository.findByBoardAndUser(
      input.boardId,
      input.requesterId,
    );

    if (!requesterMembership) {
      throw new NotFoundError("board.not.found");
    }

    const memberships = await this.membershipRepository.listByBoardId(
      input.boardId,
    );

    const members = await Promise.all(
      memberships.map(async (membership) => {
        const user = await this.memberDirectory.findById(membership.userId);

        return {
          userId: membership.userId,
          name: user?.name ?? "",
          email: user?.email ?? "",
          role: membership.role,
        };
      }),
    );

    return { members };
  }
}
