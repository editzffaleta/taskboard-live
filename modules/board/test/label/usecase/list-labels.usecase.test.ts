import { DomainError } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import { Label } from "../../../src/label/model";
import { ListLabels } from "../../../src/label/usecase/list-labels.usecase";
import { FakeLabelRepository, FakeMembershipRepository } from "../../mock";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const MEMBER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";
const OTHER_USER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";

function setup() {
  const memberships: Membership[] = [
    new Membership({ boardId: BOARD_ID, userId: MEMBER_ID, role: "owner" }),
  ];
  const labelRepository = new FakeLabelRepository();
  const membershipRepository = new FakeMembershipRepository(memberships);
  const useCase = new ListLabels(labelRepository, membershipRepository);
  return { labelRepository, membershipRepository, useCase };
}

describe("ListLabels", () => {
  it("lista as etiquetas do quadro ordenadas por criacao", async () => {
    const { labelRepository, useCase } = setup();
    const first = await labelRepository.create(
      new Label({ boardId: BOARD_ID, name: "Backend", color: "blue" }),
    );
    const second = await labelRepository.create(
      new Label({ boardId: BOARD_ID, name: "Design", color: "pink" }),
    );

    const { labels } = await useCase.execute({
      boardId: BOARD_ID,
      requesterId: MEMBER_ID,
    });

    expect(labels.map((label) => label.id)).toEqual([first.id, second.id]);
  });

  it("rejeita quando o requester nao e membro do quadro", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({ boardId: BOARD_ID, requesterId: OTHER_USER_ID }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
