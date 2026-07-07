import { Notification } from "../../../src/notification/model";
import { CountUnreadNotifications } from "../../../src/notification/usecase/count-unread-notifications.usecase";
import { FakeNotificationRepository } from "../../mock";

const USER_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

describe("CountUnreadNotifications", () => {
  it("conta apenas as notificacoes nao lidas do usuario", async () => {
    const notificationRepository = new FakeNotificationRepository();
    await notificationRepository.create(
      new Notification({ userId: USER_ID, type: "comment.added", data: {}, readAt: null }),
    );
    await notificationRepository.create(
      new Notification({ userId: USER_ID, type: "comment.added", data: {}, readAt: null }),
    );
    await notificationRepository.create(
      new Notification({
        userId: USER_ID,
        type: "comment.added",
        data: {},
        readAt: new Date(),
      }),
    );

    const useCase = new CountUnreadNotifications(notificationRepository);
    const result = await useCase.execute({ userId: USER_ID });

    expect(result.count).toBe(2);
  });
});
