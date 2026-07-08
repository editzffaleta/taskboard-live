import { DomainError, NotFoundError } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import { List } from "../../../src/list/model";
import { Card } from "../../../src/card/model";
import { Attachment } from "../../../src/attachment/model";
import { ListAttachments } from "../../../src/attachment/usecase/list-attachments.usecase";
import {
  FakeAttachmentRepository,
  FakeCardRepository,
  FakeListRepository,
  FakeMembershipRepository,
} from "../../mock";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const MEMBER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";
const OTHER_USER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";

async function setup() {
  const memberships = [
    new Membership({ boardId: BOARD_ID, userId: MEMBER_ID, role: "owner" }),
  ];
  const attachmentRepository = new FakeAttachmentRepository();
  const cardRepository = new FakeCardRepository();
  const listRepository = new FakeListRepository();
  const membershipRepository = new FakeMembershipRepository(memberships);
  const useCase = new ListAttachments(
    attachmentRepository,
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
  await attachmentRepository.create(
    new Attachment({
      cardId: card.id,
      filename: "foto.png",
      mimeType: "image/png",
      size: 1024,
      storageKey: "abc.png",
      uploadedById: MEMBER_ID,
    }),
  );

  return { attachmentRepository, cardRepository, listRepository, useCase, card };
}

describe("ListAttachments", () => {
  it("lista os anexos do cartao", async () => {
    const { useCase, card } = await setup();

    const { attachments } = await useCase.execute({
      boardId: BOARD_ID,
      cardId: card.id,
      requesterId: MEMBER_ID,
    });

    expect(attachments).toHaveLength(1);
    expect(attachments[0].filename).toBe("foto.png");
  });

  it("rejeita cartao inexistente", async () => {
    const { useCase } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: "1b3f4a2e-8a4a-4a2a-9c3f-1a2b3c4d5e6f",
        requesterId: MEMBER_ID,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita requester nao membro", async () => {
    const { useCase, card } = await setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        cardId: card.id,
        requesterId: OTHER_USER_ID,
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
