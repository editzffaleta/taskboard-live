import {
  DomainError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { MembershipRepository } from "../provider";

export interface RemoveMemberIn {
  boardId: string;
  requesterId: string;
  targetUserId: string;
}

export class RemoveMember implements UseCase<RemoveMemberIn, void> {
  constructor(private readonly membershipRepository: MembershipRepository) {}

  async execute(input: RemoveMemberIn): Promise<void> {
    Validator.validate([
      {
        code: "removeMember.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "removeMember.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "removeMember.targetUserId",
        value: input.targetUserId,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);

    const requesterMembership = await this.membershipRepository.findByBoardAndUser(
      input.boardId,
      input.requesterId,
    );

    if (!requesterMembership || requesterMembership.role !== "owner") {
      throw new DomainError("board.owner.required", 403);
    }

    const targetMembership = await this.membershipRepository.findByBoardAndUser(
      input.boardId,
      input.targetUserId,
    );

    if (targetMembership && targetMembership.role === "owner") {
      throw new DomainError("board.owner.cannot.be.removed", 403);
    }

    await this.membershipRepository.delete(input.boardId, input.targetUserId);
  }
}
