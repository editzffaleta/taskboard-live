import {
  Entity,
  EntityState,
  RequiredRule,
  UuidRule,
  Validator,
} from "@taskboard/shared";

/**
 * Catálogo de `type` suportado (padrão `<agregado>.<evento>[.you]`). Novos
 * tipos seguem o mesmo formato de payload mínimo e específico documentado
 * abaixo:
 * - `member.added.you` -> { boardId, boardName, addedByName }
 * - `card.assigned.you` -> { boardId, cardId, cardTitle, assignedByName }
 * - `comment.added` -> { boardId, cardId, cardTitle, commentId, authorName, excerpt }
 */
export interface NotificationState extends EntityState {
  userId: string;
  type: string;
  data: Record<string, unknown>;
  readAt: Date | null;
}

export class Notification extends Entity<NotificationState> {
  constructor(props: NotificationState) {
    super(props);
  }

  get userId(): string {
    return this.props.userId;
  }

  get type(): string {
    return this.props.type;
  }

  get data(): Record<string, unknown> {
    return this.props.data;
  }

  get readAt(): Date | null {
    return this.props.readAt;
  }

  public markRead(readAt: Date = new Date()): Notification {
    return this.clone({ readAt } as Partial<NotificationState>);
  }

  public validate(): void {
    Validator.validate([
      {
        code: "notification.userId",
        value: this.userId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "notification.type",
        value: this.type,
        rules: [new RequiredRule()],
      },
    ]);
  }
}
