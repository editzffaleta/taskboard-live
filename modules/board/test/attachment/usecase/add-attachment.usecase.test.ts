import { DomainError, NotFoundError } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import { List } from "../../../src/list/model";
import { Card } from "../../../src/card/model";
import { AddAttachment } from "../../../src/attachment/usecase/add-attachment.usecase";
import {
  FakeAttachmentRepository,
  FakeCardRepository,
  FakeListRepository,
  FakeMembershipRepository,
  FakeStorageProvider,
} from "../../mock";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const OTHER_BOARD_ID = "1b3f4a2e-8a4a-4a2a-9c3f-1a2b3c4d5e6f";
const MEMBER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";
const OTHER_USER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";

const PNG_BUFFER = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  Buffer.from("resto-do-arquivo"),
]);

async function setup() {
  const memberships = [
    new Membership({ boardId: BOARD_ID, userId: MEMBER_ID, role: "owner" }),
  ];
  const attachmentRepository = new FakeAttachmentRepository();
  const storageProvider = new FakeStorageProvider();
  const cardRepository = new FakeCardRepository();
  const listRepository = new FakeListRepository();
  const membershipRepository = new FakeMembershipRepository(memberships);
  const useCase = new AddAttachment(
    attachmentRepository,
    storageProvider,
    cardRepository,
    listRepository,
    membershipRepository,
  );

  const list = await listRepository.create(
    new List({ boardId: BOARD_ID, title: "A Fazer", position: 0 }),
  );
  const card = await cardRepository.create(
    new Card({ listId: list.id, title: "Cartao", position: 0 }),
  );

  return {
    attachmentRepository,
    storageProvider,
    cardRepository,
    listRepository,
    useCase,
    list,
    card,
  };
}

describe("AddAttachment", () => {
  it("cria o anexo com storageKey gerado e grava no storage", async () => {
    const { useCase, card, attachmentRepository, storageProvider } =
      await setup();

    const { attachment } = await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      uploadedById: MEMBER_ID,
      originalName: "foto.png",
      mimeType: "image/png",
      size: PNG_BUFFER.length,
      buffer: PNG_BUFFER,
    });

    expect(attachment.filename).toBe("foto.png");
    expect(attachment.storageKey).not.toContain("foto");
    expect(attachmentRepository.attachments).toHaveLength(1);
    expect(storageProvider.files.get(attachment.storageKey)).toEqual(
      PNG_BUFFER,
    );
  });

  it("sanitiza filename com separadores de caminho", async () => {
    const { useCase, card } = await setup();

    const { attachment } = await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      uploadedById: MEMBER_ID,
      originalName: "../../etc/passwd.png",
      mimeType: "image/png",
      size: PNG_BUFFER.length,
      buffer: PNG_BUFFER,
    });

    expect(attachment.filename).not.toContain("/");
    expect(attachment.filename).not.toContain("..");
  });

  it("rejeita arquivo acima de 10MB", async () => {
    const { useCase, card } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        uploadedById: MEMBER_ID,
        originalName: "foto.png",
        mimeType: "image/png",
        size: 10 * 1024 * 1024 + 1,
        buffer: PNG_BUFFER,
      }),
    ).rejects.toMatchObject({ message: "attachment.too.large" });
  });

  it("rejeita mimetype fora da allowlist", async () => {
    const { useCase, card } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        uploadedById: MEMBER_ID,
        originalName: "virus.exe",
        mimeType: "application/x-msdownload",
        size: 10,
        buffer: Buffer.from("x"),
      }),
    ).rejects.toMatchObject({ message: "attachment.type.not.allowed" });
  });

  it("rejeita quando magic bytes nao batem com o mimetype declarado", async () => {
    const { useCase, card } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        uploadedById: MEMBER_ID,
        originalName: "fake.png",
        mimeType: "image/png",
        size: 10,
        buffer: Buffer.from("nao e um png de verdade"),
      }),
    ).rejects.toMatchObject({ message: "attachment.type.not.allowed" });
  });

  it("rejeita cartao de outro quadro", async () => {
    const { useCase, listRepository, cardRepository } = await setup();
    const otherList = await listRepository.create(
      new List({ boardId: OTHER_BOARD_ID, title: "Outro", position: 0 }),
    );
    const otherCard = await cardRepository.create(
      new Card({ listId: otherList.id, title: "Outro cartao", position: 0 }),
    );

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: otherCard.id,
        uploadedById: MEMBER_ID,
        originalName: "foto.png",
        mimeType: "image/png",
        size: PNG_BUFFER.length,
        buffer: PNG_BUFFER,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita requester nao membro", async () => {
    const { useCase, card } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        uploadedById: OTHER_USER_ID,
        originalName: "foto.png",
        mimeType: "image/png",
        size: PNG_BUFFER.length,
        buffer: PNG_BUFFER,
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
