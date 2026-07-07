import {
  Entity,
  EntityState,
  InRule,
  MaxLengthRule,
  MinLengthRule,
  RequiredRule,
  UuidRule,
  Validator,
} from "@taskboard/shared";

export const LABEL_COLORS = [
  "red",
  "amber",
  "green",
  "blue",
  "purple",
  "teal",
  "pink",
] as const;

export type LabelColor = (typeof LABEL_COLORS)[number];

export interface LabelState extends EntityState {
  boardId: string;
  name: string;
  color: LabelColor;
}

export class Label extends Entity<LabelState> {
  constructor(props: LabelState) {
    super(props);
  }

  get boardId(): string {
    return this.props.boardId;
  }

  get name(): string {
    return this.props.name;
  }

  get color(): LabelColor {
    return this.props.color;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "label.boardId",
        value: this.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "label.name",
        value: this.name,
        rules: [new RequiredRule(), new MinLengthRule(1), new MaxLengthRule(60)],
      },
      {
        code: "label.color",
        value: this.color,
        rules: [new RequiredRule(), new InRule(LABEL_COLORS)],
      },
    ]);
  }
}
