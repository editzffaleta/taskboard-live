import { NotFoundError } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import { ListMembers } from "../../../src/membership/usecase/list-members.usecase";
import { FakeMemberDirectory, FakeMembershipRepository } from "../../mock";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const OWNER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";
const MEMBER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";
const OUTSIDER_ID = "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed";

function setup() {
  const memberships: Membership[] = [
    new Membership({ boardId: BOARD_ID, userId: OWNER_ID, role: "owner" }),
    new Membership({ boardId: BOARD_ID, userId: MEMBER_ID, role: "member" }),
  ];
  const membershipRepository = new FakeMembershipRepository(memberships);
  const memberDirectory = new FakeMemberDirectory([
    { id: OWNER_ID, name: "Owner", email: "owner@example.com" },
    { id: MEMBER_ID, name: "Membro", email: "membro@example.com" },
  ]);
  const useCase = new ListMembers(membershipRepository, memberDirectory);
  return { useCase };
}

describe("ListMembers", () => {
  it("permite que um membro comum liste os membros do quadro", async () => {
    const { useCase } = setup();

    const { members } = await useCase.execute({
      boardId: BOARD_ID,
      requesterId: MEMBER_ID,
    });

    expect(members).toEqual(
      expect.arrayContaining([
        {
          userId: OWNER_ID,
          name: "Owner",
          email: "owner@example.com",
          role: "owner",
        },
        {
          userId: MEMBER_ID,
          name: "Membro",
          email: "membro@example.com",
          role: "member",
        },
      ]),
    );
  });

  it("rejeita quando o requester nao e membro do quadro", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({ boardId: BOARD_ID, requesterId: OUTSIDER_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
