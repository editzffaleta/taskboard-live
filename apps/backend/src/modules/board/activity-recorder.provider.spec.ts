import { ActivityRecorderImpl } from './activity-recorder.provider';

describe('ActivityRecorderImpl', () => {
  function setup() {
    const activityRepository = {
      create: jest.fn((activity) => Promise.resolve(activity)),
    };
    const realtimeEmitter = { emitToBoard: jest.fn() };
    const recorder = new ActivityRecorderImpl(
      activityRepository as never,
      realtimeEmitter as never,
    );
    return { activityRepository, realtimeEmitter, recorder };
  }

  const BOARD_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
  const ACTOR_ID = '9c858901-8a57-4791-81fe-4c455b099bc9';

  it('persiste a atividade e emite activity.created', async () => {
    const { activityRepository, realtimeEmitter, recorder } = setup();

    await recorder.record(BOARD_ID, ACTOR_ID, 'card.created', {
      cardId: 'card-1',
    });

    expect(activityRepository.create).toHaveBeenCalledTimes(1);
    expect(realtimeEmitter.emitToBoard).toHaveBeenCalledWith(
      BOARD_ID,
      'activity.created',
      expect.objectContaining({
        boardId: BOARD_ID,
        actorId: ACTOR_ID,
        type: 'card.created',
        data: { cardId: 'card-1' },
      }),
    );
  });

  it('nao propaga excecao quando a persistencia falha', async () => {
    const activityRepository = {
      create: jest.fn(() => Promise.reject(new Error('db down'))),
    };
    const realtimeEmitter = { emitToBoard: jest.fn() };
    const recorder = new ActivityRecorderImpl(
      activityRepository as never,
      realtimeEmitter as never,
    );

    await expect(
      recorder.record(BOARD_ID, ACTOR_ID, 'card.created', {}),
    ).resolves.toBeUndefined();
    expect(realtimeEmitter.emitToBoard).not.toHaveBeenCalled();
  });
});
