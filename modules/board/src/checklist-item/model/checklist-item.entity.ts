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

export interface ChecklistItemState extends EntityState {
  cardId: string;
  text: string;
  done?: boolean;
  position: number;
}

export class ChecklistItem extends Entity<ChecklistItemState> {
  constructor(props: ChecklistItemState) {
    super(props);
  }

  get cardId(): string {
    return this.props.cardId;
  }

  get text(): string {
    return this.props.text;
  }

  get done(): boolean {
    return this.props.done ?? false;
  }

  get position(): number {
    return this.props.position;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "checklistItem.cardId",
        value: this.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "checklistItem.text",
        value: this.text,
        rules: [new RequiredRule(), new MinLengthRule(1), new MaxLengthRule(240)],
      },
      {
        code: "checklistItem.position",
        value: this.position,
        rules: [new RequiredRule(), new IntegerRule(), new MinValueRule(0)],
      },
    ]);
  }
}
