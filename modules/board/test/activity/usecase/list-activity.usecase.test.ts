import { NotFoundError, ValidationException } from "@taskboard/shared";
import { Membership } from "../../../src/membership/model";
import { Activity } from "../../../src/activity/model";
import { ListActivity } from "../../../src/activity/usecase/list-activity.usecase";
import { FakeActivityRepository, FakeMembershipRepository } from "../../mock";

const BOARD_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const MEMBER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";
const OTHER_USER_ID = "e22fa8be-9843-4769-930a-62d4f26e5e1e";

function setup() {
  const memberships: Membership[] = [
    new Membership({ boardId: BOARD_ID, userId: MEMBER_ID, role: "owner" }),
  ];
  const activityRepository = new FakeActivityRepository();
  const membershipRepository = new FakeMembershipRepository(memberships);
  const useCase = new ListActivity(activityRepository, membershipRepository);
  return { activityRepository, membershipRepository, useCase };
}

async function seedActivities(repository: FakeActivityRepository, count: number) {
  for (let index = 0; index < count; index += 1) {
    const activity = new Activity({
      boardId: BOARD_ID,
      actorId: MEMBER_ID,
      type: "card.created",
      data: { cardId: `card-${index}` },
      createdAt: new Date(2026, 0, 1, 0, index),
    });
    await repository.create(activity);
  }
}

describe("ListActivity", () => {
  it("retorna a pagina mais recente primeiro", async () => {
    const { activityRepository, useCase } = setup();
    await seedActivities(activityRepository, 3);

    const result = await useCase.execute({
      boardId: BOARD_ID,
      requesterId: MEMBER_ID,
    });

    expect(result.activities).toHaveLength(3);
    expect(result.activities[0].data).toEqual({ cardId: "card-2" });
    expect(result.activities[2].data).toEqual({ cardId: "card-0" });
    expect(result.total).toBe(3);
  });

  it("pagina os resultados", async () => {
    const { activityRepository, useCase } = setup();
    await seedActivities(activityRepository, 5);

    const result = await useCase.execute({
      boardId: BOARD_ID,
      requesterId: MEMBER_ID,
      page: 2,
      perPage: 2,
    });

    expect(result.activities).toHaveLength(2);
    expect(result.page).toBe(2);
    expect(result.perPage).toBe(2);
    expect(result.total).toBe(5);
  });

  it("rejeita quando o requester nao e membro do quadro", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({ boardId: BOARD_ID, requesterId: OTHER_USER_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejeita entrada invalida (boardId ausente)", async () => {
    const { useCase } = setup();

    await expect(
      useCase.execute({ boardId: "", requesterId: MEMBER_ID }),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
