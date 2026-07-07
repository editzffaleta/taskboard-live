import { NotificationRecorderImpl } from './notification-recorder.provider';

describe('NotificationRecorderImpl', () => {
  function setup() {
    const notificationRepository = {
      create: jest.fn((notification) => Promise.resolve(notification)),
    };
    const realtimeEmitter = { emitToUser: jest.fn(), emitToBoard: jest.fn() };
    const recorder = new NotificationRecorderImpl(
      notificationRepository as never,
      realtimeEmitter as never,
    );
    return { notificationRepository, realtimeEmitter, recorder };
  }

  const USER_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

  it('persiste a notificacao e emite notification.created via emitToUser', async () => {
    const { notificationRepository, realtimeEmitter, recorder } = setup();

    await recorder.record(USER_ID, 'comment.added', {
      cardId: 'card-1',
    });

    expect(notificationRepository.create).toHaveBeenCalledTimes(1);
    expect(realtimeEmitter.emitToUser).toHaveBeenCalledWith(
      USER_ID,
      'notification.created',
      expect.objectContaining({
        userId: USER_ID,
        type: 'comment.added',
        data: { cardId: 'card-1' },
      }),
    );
  });

  it('nao propaga excecao quando a persistencia falha', async () => {
    const notificationRepository = {
      create: jest.fn(() => Promise.reject(new Error('db down'))),
    };
    const realtimeEmitter = { emitToUser: jest.fn(), emitToBoard: jest.fn() };
    const recorder = new NotificationRecorderImpl(
      notificationRepository as never,
      realtimeEmitter as never,
    );

    await expect(
      recorder.record(USER_ID, 'comment.added', {}),
    ).resolves.toBeUndefined();
    expect(realtimeEmitter.emitToUser).not.toHaveBeenCalled();
  });
});
