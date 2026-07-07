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

export const BOARD_COLORS = [
  "blue",
  "purple",
  "green",
  "red",
  "amber",
  "cyan",
  "slate",
] as const;

export type BoardColor = (typeof BOARD_COLORS)[number];

export interface BoardState extends EntityState {
  name: string;
  ownerId: string;
  color?: string | null;
  archivedAt?: Date | null;
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

  get color(): string | null {
    return this.props.color ?? null;
  }

  get archivedAt(): Date | null {
    return this.props.archivedAt ?? null;
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
      ...(this.props.color != null
        ? [
            {
              code: "board.color",
              value: this.props.color,
              rules: [new InRule(BOARD_COLORS)],
            },
          ]
        : []),
    ]);
  }
}
