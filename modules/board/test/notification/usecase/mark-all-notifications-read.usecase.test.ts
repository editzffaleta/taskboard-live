import { Notification } from "../../../src/notification/model";
import { MarkAllNotificationsRead } from "../../../src/notification/usecase/mark-all-notifications-read.usecase";
import { FakeNotificationRepository } from "../../mock";

const USER_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const OTHER_USER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";

describe("MarkAllNotificationsRead", () => {
  it("zera a contagem de nao lidas apenas do usuario informado", async () => {
    const notificationRepository = new FakeNotificationRepository();
    await notificationRepository.create(
      new Notification({ userId: USER_ID, type: "comment.added", data: {}, readAt: null }),
    );
    await notificationRepository.create(
      new Notification({ userId: USER_ID, type: "comment.added", data: {}, readAt: null }),
    );
    await notificationRepository.create(
      new Notification({ userId: OTHER_USER_ID, type: "comment.added", data: {}, readAt: null }),
    );

    const useCase = new MarkAllNotificationsRead(notificationRepository);
    await useCase.execute({ userId: USER_ID });

    expect(await notificationRepository.countUnreadByUserId(USER_ID)).toBe(0);
    expect(await notificationRepository.countUnreadByUserId(OTHER_USER_ID)).toBe(1);
  });
});
