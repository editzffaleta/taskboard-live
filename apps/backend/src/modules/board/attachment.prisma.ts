import { Injectable } from '@nestjs/common';
import { Attachment, AttachmentRepository } from '@taskboard/board';
import { PrismaService } from '../../db/prisma.service';

type PersistedAttachment = {
  id: string;
  cardId: string;
  filename: string;
  mimeType: string;
  size: number;
  storageKey: string;
  uploadedById: string;
  createdAt: Date;
};

@Injectable()
export class PrismaAttachmentRepository implements AttachmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(attachment: Attachment): Promise<Attachment> {
    const created = await this.prisma.attachment.create({
      data: this.toPersistence(attachment),
    });

    return this.toDomain(created);
  }

  async findById(id: string): Promise<Attachment | null> {
    const found = await this.prisma.attachment.findUnique({ where: { id } });

    return found ? this.toDomain(found) : null;
  }

  async findAllByCardId(cardId: string): Promise<Attachment[]> {
    const found = await this.prisma.attachment.findMany({
      where: { cardId },
      orderBy: { createdAt: 'asc' },
    });

    return found.map((item) => this.toDomain(item));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.attachment.delete({ where: { id } });
  }

  private toPersistence(attachment: Attachment) {
    return {
      id: attachment.id,
      cardId: attachment.cardId,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      storageKey: attachment.storageKey,
      uploadedById: attachment.uploadedById,
    };
  }

  private toDomain(raw: PersistedAttachment): Attachment {
    return new Attachment({
      id: raw.id,
      createdAt: raw.createdAt,
      cardId: raw.cardId,
      filename: raw.filename,
      mimeType: raw.mimeType,
      size: raw.size,
      storageKey: raw.storageKey,
      uploadedById: raw.uploadedById,
    });
  }
}
