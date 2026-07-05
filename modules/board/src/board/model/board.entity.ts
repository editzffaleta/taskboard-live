import {
  Entity,
  EntityState,
  MaxLengthRule,
  MinLengthRule,
  RequiredRule,
  UuidRule,
  Validator,
} from "@taskboard/shared";

export interface BoardState extends EntityState {
  name: string;
  ownerId: string;
}

export class Board extends Entity<BoardState> {
  constructor(props: BoardState) {
    super(props);
  }

  get name(): string {
    return this.props.name;
  }

  get ownerId(): string {
    return this.props.ownerId;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "board.name",
        value: this.name,
        rules: [new RequiredRule(), new MinLengthRule(1), new MaxLengthRule(120)],
      },
      {
        code: "board.ownerId",
        value: this.ownerId,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);
  }
}
