import { Attachment } from "../../src/attachment/model";
import { AttachmentRepository } from "../../src/attachment/provider";

export class FakeAttachmentRepository implements AttachmentRepository {
  readonly attachments: Attachment[] = [];

  async create(attachment: Attachment): Promise<Attachment> {
    this.attachments.push(attachment);
    return attachment;
  }

  async findById(id: string): Promise<Attachment | null> {
    return this.attachments.find((attachment) => attachment.id === id) ?? null;
  }

  async findAllByCardId(cardId: string): Promise<Attachment[]> {
    return this.attachments
      .filter((attachment) => attachment.cardId === cardId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async delete(id: string): Promise<void> {
    const index = this.attachments.findIndex(
      (attachment) => attachment.id === id,
    );
    if (index >= 0) {
      this.attachments.splice(index, 1);
    }
  }
}
