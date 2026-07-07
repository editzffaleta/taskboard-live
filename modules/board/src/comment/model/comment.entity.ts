import {
  Entity,
  EntityState,
  MaxLengthRule,
  MinLengthRule,
  RequiredRule,
  UuidRule,
  Validator,
} from "@taskboard/shared";

export interface CommentState extends EntityState {
  cardId: string;
  authorId: string;
  text: string;
}

export class Comment extends Entity<CommentState> {
  constructor(props: CommentState) {
    super(props);
  }

  get cardId(): string {
    return this.props.cardId;
  }

  get authorId(): string {
    return this.props.authorId;
  }

  get text(): string {
    return this.props.text;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "comment.cardId",
        value: this.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "comment.authorId",
        value: this.authorId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "comment.text",
        value: this.text,
        rules: [new RequiredRule(), new MinLengthRule(1), new MaxLengthRule(2000)],
      },
    ]);
  }
}
