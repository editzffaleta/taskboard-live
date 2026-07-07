import {
  Entity,
  EntityState,
  IntegerRule,
  MaxLengthRule,
  MinLengthRule,
  MinValueRule,
  RequiredRule,
  UuidRule,
  Validator,
} from "@taskboard/shared";

export interface ListState extends EntityState {
  boardId: string;
  title: string;
  position: number;
  archivedAt?: Date | null;
}

export class List extends Entity<ListState> {
  constructor(props: ListState) {
    super(props);
  }

  get boardId(): string {
    return this.props.boardId;
  }

  get title(): string {
    return this.props.title;
  }

  get position(): number {
    return this.props.position;
  }

  get archivedAt(): Date | null {
    return this.props.archivedAt ?? null;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "list.boardId",
        value: this.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "list.title",
        value: this.title,
        rules: [new RequiredRule(), new MinLengthRule(1), new MaxLengthRule(120)],
      },
      {
        code: "list.position",
        value: this.position,
        rules: [new RequiredRule(), new IntegerRule(), new MinValueRule(0)],
      },
    ]);
  }
}
