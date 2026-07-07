import { NotFoundError } from "@taskboard/shared";
import { Notification } from "../../../src/notification/model";
import { MarkNotificationRead } from "../../../src/notification/usecase/mark-notification-read.usecase";
import { FakeNotificationRepository } from "../../mock";

const USER_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
const OTHER_USER_ID = "9c858901-8a57-4791-81fe-4c455b099bc9";

describe("MarkNotificationRead", () => {
  it("marca a notificacao do proprio usuario como lida", async () => {
    const notificationRepository = new FakeNotificationRepository();
    const notification = await notificationRepository.create(
      new Notification({ userId: USER_ID, type: "comment.added", data: {}, readAt: null }),
    );

    const useCase = new MarkNotificationRead(notificationRepository);
    const result = await useCase.execute({
      notificationId: notification.id,
      userId: USER_ID,
    });

    expect(result.notification.readAt).not.toBeNull();
  });

  it("e idempotente quando ja esta lida", async () => {
    const notificationRepository = new FakeNotificationRepository();
    const readAt = new Date(2026, 0, 1);
    const notification = await notificationRepository.create(
      new Notification({ userId: USER_ID, type: "comment.added", data: {}, readAt }),
    );

    const useCase = new MarkNotificationRead(notificationRepository);
    const result = await useCase.execute({
      notificationId: notification.id,
      userId: USER_ID,
    });

    expect(result.notification.readAt).toEqual(readAt);
  });

  it("retorna 404 para notificacao inexistente", async () => {
    const notificationRepository = new FakeNotificationRepository();
    const useCase = new MarkNotificationRead(notificationRepository);

    await expect(
      useCase.execute({
        notificationId: "b4f1c1a2-4d3e-4c6f-9a9e-2f7f6a1c9d10",
        userId: USER_ID,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("retorna 404 para notificacao de outro usuario", async () => {
    const notificationRepository = new FakeNotificationRepository();
    const notification = await notificationRepository.create(
      new Notification({ userId: OTHER_USER_ID, type: "comment.added", data: {}, readAt: null }),
    );

    const useCase = new MarkNotificationRead(notificationRepository);

    await expect(
      useCase.execute({ notificationId: notification.id, userId: USER_ID }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
