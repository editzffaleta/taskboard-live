import { Attachment } from "../model";

export interface AttachmentRepository {
  create(attachment: Attachment): Promise<Attachment>;
  findById(id: string): Promise<Attachment | null>;
  findAllByCardId(cardId: string): Promise<Attachment[]>;
  delete(id: string): Promise<void>;
}
