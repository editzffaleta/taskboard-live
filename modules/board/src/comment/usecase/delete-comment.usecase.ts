import {
  DomainError,
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { CommentRepository } from "../provider";

export interface DeleteCommentIn {
  boardId: string;
  cardId: string;
  commentId: string;
  requesterId: string;
}

export interface DeleteCommentOut {
  commentId: string;
  cardId: string;
}

export class DeleteComment
  implements UseCase<DeleteCommentIn, DeleteCommentOut>
{
  constructor(private readonly commentRepository: CommentRepository) {}

  async execute(input: DeleteCommentIn): Promise<DeleteCommentOut> {
    Validator.validate([
      {
        code: "deleteComment.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "deleteComment.cardId",
        value: input.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "deleteComment.commentId",
        value: input.commentId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "deleteComment.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);

    const comment = await this.commentRepository.findById(input.commentId);

    if (!comment || comment.cardId !== input.cardId) {
      throw new NotFoundError("comment.not.found");
    }

    if (comment.authorId !== input.requesterId) {
      throw new DomainError("comment.author.required", 403);
    }

    await this.commentRepository.delete(comment.id);

    return { commentId: comment.id, cardId: comment.cardId };
  }
}
