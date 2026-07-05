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

export interface CardState extends EntityState {
  listId: string;
  title: string;
  description?: string | null;
  position: number;
}

export class Card extends Entity<CardState> {
  constructor(props: CardState) {
    super(props);
  }

  get listId(): string {
    return this.props.listId;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string | null {
    return this.props.description ?? null;
  }

  get position(): number {
    return this.props.position;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "card.listId",
        value: this.listId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "card.title",
        value: this.title,
        rules: [new RequiredRule(), new MinLengthRule(1), new MaxLengthRule(120)],
      },
      {
        code: "card.description",
        value: this.description,
        rules: this.description === null ? [] : [new MaxLengthRule(2000)],
      },
      {
        code: "card.position",
        value: this.position,
        rules: [new RequiredRule(), new IntegerRule(), new MinValueRule(0)],
      },
    ]);
  }
}
