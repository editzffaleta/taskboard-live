import {
  DomainError,
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { Membership } from "../model";
import { MemberDirectory, MembershipRepository } from "../provider";

export interface AddMemberIn {
  boardId: string;
  requesterId: string;
  email: string;
}

export interface AddMemberMemberOut {
  id: string;
  name: string;
  email: string;
  role: "owner" | "member";
}

export interface AddMemberOut {
  membership: Membership;
  member: AddMemberMemberOut;
}

export class AddMember implements UseCase<AddMemberIn, AddMemberOut> {
  constructor(
    private readonly membershipRepository: MembershipRepository,
    private readonly memberDirectory: MemberDirectory,
  ) {}

  async execute(input: AddMemberIn): Promise<AddMemberOut> {
    Validator.validate([
      {
        code: "addMember.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "addMember.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "addMember.email",
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

    const user = await this.memberDirectory.findByEmail(input.email);

    if (!user) {
      throw new NotFoundError("board.member.not.found");
    }

    const existingMembership = await this.membershipRepository.findByBoardAndUser(
      input.boardId,
      user.id,
    );

    if (existingMembership) {
      throw new DomainError("board.member.already.exists", 409);
    }

    const membership = await this.membershipRepository.create(
      input.boardId,
      user.id,
      "member",
    );

    return {
      membership,
      member: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: "member",
      },
    };
  }
}
