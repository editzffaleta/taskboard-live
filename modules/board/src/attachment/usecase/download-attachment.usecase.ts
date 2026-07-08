import {
  DomainError,
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { Attachment } from "../model";
import { AttachmentRepository, StorageProvider } from "../provider";
import { CardRepository } from "../../card/provider";
import { ListRepository } from "../../list/provider";
import { MembershipRepository } from "../../membership/provider";

export interface DownloadAttachmentIn {
  boardId: string;
  cardId: string;
  attachmentId: string;
  requesterId: string;
}

export interface DownloadAttachmentOut {
  attachment: Attachment;
  content: Buffer;
}

export class DownloadAttachment
  implements UseCase<DownloadAttachmentIn, DownloadAttachmentOut>
{
  constructor(
    private readonly attachmentRepository: AttachmentRepository,
    private readonly storageProvider: StorageProvider,
    private readonly cardRepository: CardRepository,
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(
    input: DownloadAttachmentIn,
  ): Promise<DownloadAttachmentOut> {
    Validator.validate([
      {
        code: "downloadAttachment.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "downloadAttachment.cardId",
        value: input.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "downloadAttachment.attachmentId",
        value: input.attachmentId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "downloadAttachment.requesterId",
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

    const attachment = await this.attachmentRepository.findById(
      input.attachmentId,
    );

    if (!attachment || attachment.cardId !== input.cardId) {
      throw new NotFoundError("attachment.not.found");
    }

    const content = await this.storageProvider.read(attachment.storageKey);

    return { attachment, content };
  }
}
