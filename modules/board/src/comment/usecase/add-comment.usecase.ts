import {
  DomainError,
  MaxLengthRule,
  MinLengthRule,
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { Comment } from "../model";
import { CommentRepository } from "../provider";
import { CardRepository } from "../../card/provider";
import { ListRepository } from "../../list/provider";
import { MembershipRepository } from "../../membership/provider";

export interface AddCommentIn {
  boardId: string;
  cardId: string;
  authorId: string;
  text: string;
}

export interface AddCommentOut {
  comment: Comment;
}

export class AddComment implements UseCase<AddCommentIn, AddCommentOut> {
  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly cardRepository: CardRepository,
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: AddCommentIn): Promise<AddCommentOut> {
    Validator.validate([
      {
        code: "addComment.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "addComment.cardId",
        value: input.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "addComment.authorId",
        value: input.authorId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "addComment.text",
        value: input.text,
        rules: [new RequiredRule(), new MinLengthRule(1), new MaxLengthRule(2000)],
      },
    ]);

    const card = await this.cardRepository.findById(input.cardId);

    if (!card) {
      throw new NotFoundError("card.not.found");
    }

    const list = await this.listRepository.findById(card.listId);

    if (!list || list.boardId !== input.boardId) {
      throw new NotFoundError("card.not.found");
    }

    const membership = await this.membershipRepository.findByBoardAndUser(
      list.boardId,
      input.authorId,
    );

    if (!membership) {
      throw new DomainError("board.member.required", 403);
    }

    const comment = new Comment({
      cardId: card.id,
      authorId: input.authorId,
      text: input.text,
    });
    comment.validate();

    const created = await this.commentRepository.create(comment);

    return { comment: created };
  }
}
