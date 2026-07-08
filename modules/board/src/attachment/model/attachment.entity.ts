import {
  Entity,
  EntityState,
  MinValueRule,
  RequiredRule,
  UuidRule,
  Validator,
} from "@taskboard/shared";

export interface AttachmentState extends EntityState {
  cardId: string;
  filename: string;
  mimeType: string;
  size: number;
  storageKey: string;
  uploadedById: string;
}

export class Attachment extends Entity<AttachmentState> {
  constructor(props: AttachmentState) {
    super(props);
  }

  get cardId(): string {
    return this.props.cardId;
  }

  get filename(): string {
    return this.props.filename;
  }

  get mimeType(): string {
    return this.props.mimeType;
  }

  get size(): number {
    return this.props.size;
  }

  get storageKey(): string {
    return this.props.storageKey;
  }

  get uploadedById(): string {
    return this.props.uploadedById;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "attachment.cardId",
        value: this.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "attachment.filename",
        value: this.filename,
        rules: [new RequiredRule()],
      },
      {
        code: "attachment.mimeType",
        value: this.mimeType,
        rules: [new RequiredRule()],
      },
      {
        code: "attachment.size",
        value: this.size,
        rules: [new RequiredRule(), new MinValueRule(1)],
      },
      {
        code: "attachment.storageKey",
        value: this.storageKey,
        rules: [new RequiredRule()],
      },
      {
        code: "attachment.uploadedById",
        value: this.uploadedById,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);
  }
}
