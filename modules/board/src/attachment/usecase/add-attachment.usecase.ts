import { randomUUID } from "node:crypto";
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

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_MIME_TYPES: Record<string, string[]> = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "text/csv": [".csv"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
};

const MAGIC_BYTES_BY_MIME_TYPE: Record<string, Buffer[]> = {
  "image/png": [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  "image/jpeg": [Buffer.from([0xff, 0xd8, 0xff])],
  "image/gif": [Buffer.from("GIF38", "ascii")],
  "application/pdf": [Buffer.from("%PDF", "ascii")],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  ],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  ],
};

function checkWebpSignature(buffer: Buffer): boolean {
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function hasValidMagicBytes(mimeType: string, buffer: Buffer): boolean {
  if (mimeType === "image/webp") {
    return checkWebpSignature(buffer);
  }

  const signatures = MAGIC_BYTES_BY_MIME_TYPE[mimeType];

  if (!signatures) {
    return true;
  }

  return signatures.some(
    (signature) =>
      buffer.length >= signature.length &&
      buffer.subarray(0, signature.length).equals(signature),
  );
}

function extensionOf(filename: string): string {
  const lastDot = filename.lastIndexOf(".");

  return lastDot === -1 ? "" : filename.slice(lastDot).toLowerCase();
}

export function sanitizeFilename(filename: string): string {
  const withoutPathSeparators = filename
    .replace(/[/\\]/g, "_")
    .replace(/\.\./g, "_");
  // eslint-disable-next-line no-control-regex
  const withoutControlChars = withoutPathSeparators.replace(/[\x00-\x1f]/g, "");
  const trimmed = withoutControlChars.trim();

  return trimmed.length > 0 ? trimmed : "arquivo";
}

export interface AddAttachmentIn {
  boardId: string;
  cardId: string;
  uploadedById: string;
  originalName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}

export interface AddAttachmentOut {
  attachment: Attachment;
}

export class AddAttachment
  implements UseCase<AddAttachmentIn, AddAttachmentOut>
{
  constructor(
    private readonly attachmentRepository: AttachmentRepository,
    private readonly storageProvider: StorageProvider,
    private readonly cardRepository: CardRepository,
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: AddAttachmentIn): Promise<AddAttachmentOut> {
    Validator.validate([
      {
        code: "addAttachment.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "addAttachment.cardId",
        value: input.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "addAttachment.uploadedById",
        value: input.uploadedById,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "addAttachment.originalName",
        value: input.originalName,
        rules: [new RequiredRule()],
      },
      {
        code: "addAttachment.mimeType",
        value: input.mimeType,
        rules: [new RequiredRule()],
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
      input.uploadedById,
    );

    if (!membership) {
      throw new DomainError("board.member.required", 403);
    }

    if (input.size <= 0 || input.size > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new DomainError("attachment.too.large", 422);
    }

    const allowedExtensions = ALLOWED_ATTACHMENT_MIME_TYPES[input.mimeType];
    const extension = extensionOf(input.originalName);

    if (!allowedExtensions || !allowedExtensions.includes(extension)) {
      throw new DomainError("attachment.type.not.allowed", 422);
    }

    if (!hasValidMagicBytes(input.mimeType, input.buffer)) {
      throw new DomainError("attachment.type.not.allowed", 422);
    }

    const sanitizedFilename = sanitizeFilename(input.originalName);
    const storageKey = `${randomUUID()}${extension}`;

    await this.storageProvider.save(storageKey, input.buffer);

    const attachment = new Attachment({
      cardId: card.id,
      filename: sanitizedFilename,
      mimeType: input.mimeType,
      size: input.size,
      storageKey,
      uploadedById: input.uploadedById,
    });
    attachment.validate();

    const created = await this.attachmentRepository.create(attachment);

    return { attachment: created };
  }
}
