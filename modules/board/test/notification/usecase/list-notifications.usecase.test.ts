import { Notification } from "../../../src/notification/model";
import { ListNotifications } from "../../../src/notification/usecase/list-notifications.usecase";
import { FakeNotificationRepository } from "../../mock";

const USER_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const OTHER_USER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";

function setup() {
  const notificationRepository = new FakeNotificationRepository();
  const useCase = new ListNotifications(notificationRepository);
  return { notificationRepository, useCase };
}

async function seedNotifications(
  repository: FakeNotificationRepository,
  userId: string,
  count: number,
) {
  for (let index = 0; index < count; index += 1) {
    const notification = new Notification({
      userId,
      type: "comment.added",
      data: { commentId: `comment-${index}` },
      readAt: null,
      createdAt: new Date(2026, 0, 1, 0, index),
    });
    await repository.create(notification);
  }
}

describe("ListNotifications", () => {
  it("retorna a pagina mais recente primeiro, restrita ao usuario", async () => {
    const { notificationRepository, useCase } = setup();
    await seedNotifications(notificationRepository, USER_ID, 3);
    await seedNotifications(notificationRepository, OTHER_USER_ID, 2);

    const result = await useCase.execute({ userId: USER_ID });

    expect(result.notifications).toHaveLength(3);
    expect(result.notifications[0].data).toEqual({ commentId: "comment-2" });
    expect(result.notifications[2].data).toEqual({ commentId: "comment-0" });
    expect(result.total).toBe(3);
  });

  it("pagina os resultados", async () => {
    const { notificationRepository, useCase } = setup();
    await seedNotifications(notificationRepository, USER_ID, 5);

    const result = await useCase.execute({
      userId: USER_ID,
      page: 2,
      perPage: 2,
    });

    expect(result.notifications).toHaveLength(2);
    expect(result.page).toBe(2);
    expect(result.perPage).toBe(2);
    expect(result.total).toBe(5);
  });
});
