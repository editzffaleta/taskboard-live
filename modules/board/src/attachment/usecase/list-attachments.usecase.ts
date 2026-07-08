import {
  DomainError,
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { Attachment } from "../model";
import { AttachmentRepository } from "../provider";
import { CardRepository } from "../../card/provider";
import { ListRepository } from "../../list/provider";
import { MembershipRepository } from "../../membership/provider";

export interface ListAttachmentsIn {
  boardId: string;
  cardId: string;
  requesterId: string;
}

export interface ListAttachmentsOut {
  attachments: Attachment[];
}

export class ListAttachments
  implements UseCase<ListAttachmentsIn, ListAttachmentsOut>
{
  constructor(
    private readonly attachmentRepository: AttachmentRepository,
    private readonly cardRepository: CardRepository,
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: ListAttachmentsIn): Promise<ListAttachmentsOut> {
    Validator.validate([
      {
        code: "listAttachments.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "listAttachments.cardId",
        value: input.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "listAttachments.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
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

    const attachments = await this.attachmentRepository.findAllByCardId(
      card.id,
    );

    return { attachments };
  }
}
