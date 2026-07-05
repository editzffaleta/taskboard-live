import {
  Entity,
  EntityState,
  RequiredRule,
  UuidRule,
  Validator,
} from "@taskboard/shared";

/**
 * Catálogo de `type` suportado (padrão `<agregado>.<ação>`). Novos tipos
 * seguem o mesmo formato de payload mínimo e específico documentado abaixo:
 * - `list.created`   -> { listId, title }
 * - `list.updated`   -> { listId, title }
 * - `list.moved`     -> { listId, position }
 * - `list.deleted`   -> { listId }
 * - `card.created`   -> { cardId, listId, title }
 * - `card.updated`   -> { cardId, listId, title }
 * - `card.moved`     -> { cardId, fromListId, toListId, position }
 * - `card.deleted`   -> { cardId, listId }
 * - `member.added`   -> { memberId, name }
 */
export interface ActivityState extends EntityState {
  boardId: string;
  actorId: string;
  type: string;
  data: Record<string, unknown>;
}

export class Activity extends Entity<ActivityState> {
  constructor(props: ActivityState) {
    super(props);
  }

  get boardId(): string {
    return this.props.boardId;
  }

  get actorId(): string {
    return this.props.actorId;
  }

  get type(): string {
    return this.props.type;
  }

  get data(): Record<string, unknown> {
    return this.props.data;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "activity.boardId",
        value: this.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "activity.actorId",
        value: this.actorId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "activity.type",
        value: this.type,
        rules: [new RequiredRule()],
      },
    ]);
  }
}
