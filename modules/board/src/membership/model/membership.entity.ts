import {
  Entity,
  EntityState,
  InRule,
  RequiredRule,
  UuidRule,
  Validator,
} from "@taskboard/shared";

export type MembershipRole = "owner" | "member";

export interface MembershipState extends EntityState {
  boardId: string;
  userId: string;
  role: MembershipRole;
}

export class Membership extends Entity<MembershipState> {
  constructor(props: MembershipState) {
    super(props);
  }

  get boardId(): string {
    return this.props.boardId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get role(): MembershipRole {
    return this.props.role;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "membership.boardId",
        value: this.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "membership.userId",
        value: this.userId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "membership.role",
        value: this.role,
        rules: [new RequiredRule(), new InRule(["owner", "member"])],
      },
    ]);
  }
}
