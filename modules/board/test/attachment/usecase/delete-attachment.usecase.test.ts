import { DomainError, NotFoundError } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import { Attachment } from "../../../src/attachment/model";
import { DeleteAttachment } from "../../../src/attachment/usecase/delete-attachment.usecase";
import { FakeAttachmentRepository, FakeMembershipRepository, FakeStorageProvider } from "../../mock";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const CARD_ID = "1b3f4a2e-8a4a-4a2a-9c3f-1a2b3c4d5e6f";
const OWNER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";
const AUTHOR_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";
const OTHER_MEMBER_ID = "a1b2c3d4-5717-4562-b3fc-2c963f66afa6";
const CONTENT = Buffer.from("conteudo-do-arquivo");

async function setup() {
  const memberships = [
    new Membership({ boardId: BOARD_ID, userId: OWNER_ID, role: "owner" }),
    new Membership({ boardId: BOARD_ID, userId: AUTHOR_ID, role: "member" }),
    new Membership({
      boardId: BOARD_ID,
      userId: OTHER_MEMBER_ID,
      role: "member",
    }),
  ];
  const attachmentRepository = new FakeAttachmentRepository();
  const storageProvider = new FakeStorageProvider();
  const membershipRepository = new FakeMembershipRepository(memberships);
  const useCase = new DeleteAttachment(
    attachmentRepository,
    storageProvider,
    membershipRepository,
  );

  const attachment = await attachmentRepository.create(
    new Attachment({
      cardId: CARD_ID,
      filename: "foto.png",
      mimeType: "image/png",
      size: CONTENT.length,
      storageKey: "abc.png",
      uploadedById: AUTHOR_ID,
    }),
  );
  await storageProvider.save(attachment.storageKey, CONTENT);

  return { attachmentRepository, storageProvider, useCase, attachment };
}

describe("DeleteAttachment", () => {
  it("autor do upload remove o proprio anexo", async () => {
    const { useCase, attachment, attachmentRepository, storageProvider } =
      await setup();

    await useCase.execute({
      boardId: BOARD_ID,
      cardId: CARD_ID,
      attachmentId: attachment.id,
      requesterId: AUTHOR_ID,
    });

    expect(attachmentRepository.attachments).toHaveLength(0);
    expect(storageProvider.files.has(attachment.storageKey)).toBe(false);
  });

  it("owner do quadro remove anexo de outro membro", async () => {
    const { useCase, attachment, attachmentRepository } = await setup();

    await useCase.execute({
      boardId: BOARD_ID,
      cardId: CARD_ID,
      attachmentId: attachment.id,
      requesterId: OWNER_ID,
    });

    expect(attachmentRepository.attachments).toHaveLength(0);
  });

  it("rejeita membro que nao e autor nem owner", async () => {
    const { useCase, attachment, attachmentRepository, storageProvider } =
      await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: CARD_ID,
        attachmentId: attachment.id,
        requesterId: OTHER_MEMBER_ID,
      }),
    ).rejects.toBeInstanceOf(DomainError);

    expect(attachmentRepository.attachments).toHaveLength(1);
    expect(storageProvider.files.has(attachment.storageKey)).toBe(true);
  });

  it("rejeita anexo de outro cartao", async () => {
    const { useCase, attachment } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: "a1b2c3d4-8a4a-4a2a-9c3f-1a2b3c4d5e6f",
        attachmentId: attachment.id,
        requesterId: AUTHOR_ID,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
