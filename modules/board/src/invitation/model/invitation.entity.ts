import {
  Entity,
  EntityState,
  InRule,
  RequiredRule,
  UuidRule,
  Validator,
} from "@taskboard/shared";

export type InvitationRole = "member";
export type InvitationStatus = "pending" | "accepted" | "revoked";

export interface InvitationState extends EntityState {
  boardId: string;
  email: string;
  token: string;
  role: InvitationRole;
  status: InvitationStatus;
  invitedById: string;
}

export class Invitation extends Entity<InvitationState> {
  constructor(props: InvitationState) {
    super(props);
  }

  get boardId(): string {
    return this.props.boardId;
  }

  get email(): string {
    return this.props.email;
  }

  get token(): string {
    return this.props.token;
  }

  get role(): InvitationRole {
    return this.props.role;
  }

  get status(): InvitationStatus {
    return this.props.status;
  }

  get invitedById(): string {
    return this.props.invitedById;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "invitation.boardId",
        value: this.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "invitation.email",
        value: this.email,
        rules: [new RequiredRule()],
      },
      {
        code: "invitation.token",
        value: this.token,
        rules: [new RequiredRule()],
      },
      {
        code: "invitation.role",
        value: this.role,
        rules: [new RequiredRule(), new InRule(["member"])],
      },
      {
        code: "invitation.status",
        value: this.status,
        rules: [
          new RequiredRule(),
          new InRule(["pending", "accepted", "revoked"]),
        ],
      },
      {
        code: "invitation.invitedById",
        value: this.invitedById,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);
  }
}
