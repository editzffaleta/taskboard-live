import { ValidationException } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import { RemoveMember } from "../../../src/membership/usecase/remove-member.usecase";
import { FakeMembershipRepository } from "../../mock";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const OWNER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";
const MEMBER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";

function setup() {
  const memberships: Membership[] = [
    new Membership({ boardId: BOARD_ID, userId: OWNER_ID, role: "owner" }),
    new Membership({ boardId: BOARD_ID, userId: MEMBER_ID, role: "member" }),
  ];
  const membershipRepository = new FakeMembershipRepository(memberships);
  const useCase = new RemoveMember(membershipRepository);
  return { membershipRepository, useCase };
}

describe("RemoveMember", () => {
  it("permite o owner remover um membro comum", async () => {
    const { useCase, membershipRepository } = setup();

    await useCase.execute({
      boardId: BOARD_ID,
      requesterId: OWNER_ID,
      targetUserId: MEMBER_ID,
    });

    const found = await membershipRepository.findByBoardAndUser(
      BOARD_ID,
      MEMBER_ID,
    );
    expect(found).toBeNull();
  });

  it("rejeita quando o requester nao e owner", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        requesterId: MEMBER_ID,
        targetUserId: MEMBER_ID,
      }),
    ).rejects.toMatchObject({
      message: "board.owner.required",
      statusCode: 403,
    });
  });

  it("rejeita a tentativa de remover o proprio owner", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        boardId: BOARD_ID,
        requesterId: OWNER_ID,
        targetUserId: OWNER_ID,
      }),
    ).rejects.toMatchObject({
      message: "board.owner.cannot.be.removed",
      statusCode: 403,
    });
  });

  it("rejeita entrada invalida", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({
        boardId: "",
        requesterId: OWNER_ID,
        targetUserId: MEMBER_ID,
      }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
