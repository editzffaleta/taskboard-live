import {
  DomainError,
  IntegerRule,
  MinValueRule,
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

export interface ListCommentsIn {
  boardId: string;
  cardId: string;
  requesterId: string;
  page: number;
  pageSize: number;
}

export interface ListCommentsOut {
  comments: Comment[];
  total: number;
  page: number;
  pageSize: number;
}

export class ListComments implements UseCase<ListCommentsIn, ListCommentsOut> {
  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly cardRepository: CardRepository,
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: ListCommentsIn): Promise<ListCommentsOut> {
    Validator.validate([
      {
        code: "listComments.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "listComments.cardId",
        value: input.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "listComments.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "listComments.page",
        value: input.page,
        rules: [new RequiredRule(), new IntegerRule(), new MinValueRule(1)],
      },
      {
        code: "listComments.pageSize",
        value: input.pageSize,
        rules: [new RequiredRule(), new IntegerRule(), new MinValueRule(1)],
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
      input.requesterId,
    );

    if (!membership) {
      throw new DomainError("board.member.required", 403);
    }

    const [comments, total] = await Promise.all([
      this.commentRepository.findAllByCardId(
        card.id,
        input.page,
        input.pageSize,
      ),
      this.commentRepository.countByCardId(card.id),
    ]);

    return { comments, total, page: input.page, pageSize: input.pageSize };
  }
}
