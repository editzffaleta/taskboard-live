import {
  DomainError,
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { AttachmentRepository, StorageProvider } from "../provider";
import { MembershipRepository } from "../../membership/provider";

export interface DeleteAttachmentIn {
  boardId: string;
  cardId: string;
  attachmentId: string;
  requesterId: string;
}

export interface DeleteAttachmentOut {
  attachmentId: string;
  cardId: string;
}

export class DeleteAttachment
  implements UseCase<DeleteAttachmentIn, DeleteAttachmentOut>
{
  constructor(
    private readonly attachmentRepository: AttachmentRepository,
    private readonly storageProvider: StorageProvider,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: DeleteAttachmentIn): Promise<DeleteAttachmentOut> {
    Validator.validate([
      {
        code: "deleteAttachment.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "deleteAttachment.cardId",
        value: input.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "deleteAttachment.attachmentId",
        value: input.attachmentId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "deleteAttachment.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);

    const attachment = await this.attachmentRepository.findById(
      input.attachmentId,
    );

    if (!attachment || attachment.cardId !== input.cardId) {
      throw new NotFoundError("attachment.not.found");
    }

    const membership = await this.membershipRepository.findByBoardAndUser(
      input.boardId,
      input.requesterId,
    );

    if (!membership) {
      throw new DomainError("board.member.required", 403);
    }

    const isAuthor = attachment.uploadedById === input.requesterId;
    const isOwner = membership.role === "owner";

    if (!isAuthor && !isOwner) {
      throw new DomainError("attachment.author.or.owner.required", 403);
    }

    await this.storageProvider.remove(attachment.storageKey);
    await this.attachmentRepository.delete(attachment.id);

    return { attachmentId: attachment.id, cardId: attachment.cardId };
  }
}
