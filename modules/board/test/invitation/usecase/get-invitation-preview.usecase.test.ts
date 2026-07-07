import { NotFoundError } from "@taskboard/shared";
import { Board } from "../../../src/board/model";
import { GetInvitationPreview } from "../../../src/invitation/usecase/get-invitation-preview.usecase";
import {
  FakeBoardRepository,
  FakeInvitationRepository,
  FakeMemberDirectory,
} from "../../mock";

const OWNER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";

function setup() {
  const boardRepository = new FakeBoardRepository();
  const memberDirectory = new FakeMemberDirectory([
    { id: OWNER_ID, name: "Owner", email: "owner@example.com" },
  ]);
  const invitationRepository = new FakeInvitationRepository();
  const useCase = new GetInvitationPreview(
    invitationRepository,
    boardRepository,
    memberDirectory,
  );
  return { boardRepository, memberDirectory, invitationRepository, useCase };
}

describe("GetInvitationPreview", () => {
  it("retorna a previa sem vazar boardId para um token existente", async () => {
    const { useCase, invitationRepository, boardRepository } = setup();

    const board = new Board({ name: "Quadro X", ownerId: OWNER_ID });
    (boardRepository.boards as Board[]).push(board);

    const invitation = await invitationRepository.create({
      boardId: board.id,
      email: "convidado@example.com",
      token: "token-abc",
      invitedById: OWNER_ID,
    });

    const preview = await useCase.execute({ token: invitation.token });

    expect(preview).toEqual({
      boardName: "Quadro X",
      invitedByName: "Owner",
      email: "convidado@example.com",
      status: "pending",
    });
    expect(Object.keys(preview)).toEqual([
      "boardName",
      "invitedByName",
      "email",
      "status",
    ]);
  });

  it("token inexistente: 404", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({ token: "nao-existe" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
