import { INestApplication, NestMiddleware } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { ApiExceptionFilter } from '../../shared/errors/api-exception.filter';
import { NotificationController } from './notification.controller';
import { PrismaNotificationRepository } from './notification.prisma';

class FakeCurrentUserMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const userId = req.header('x-current-user-id');
    if (userId) {
      (req as unknown as { user: { id: string } }).user = { id: userId };
    }
    next();
  }
}

const USER_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const OTHER_USER_ID = 'e22fa8be-9843-4769-930a-62d4f26e5e1e';
const NOTIFICATION_ID = '9c858901-8a57-4791-81fe-4c455b099bc9';

type FakeNotification = {
  id: string;
  userId: string;
  type: string;
  data: Record<string, unknown>;
  readAt: Date | null;
  createdAt: Date;
};

describe('NotificationController (integração HTTP)', () => {
  let app: INestApplication<App>;
  let notifications: FakeNotification[];

  function notificationRepositoryMock() {
    return {
      findAllByUserId: jest.fn(
        ({
          userId,
          page,
          perPage,
        }: {
          userId: string;
          page: number;
          perPage: number;
        }) => {
          const filtered = notifications
            .filter((notification) => notification.userId === userId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          const start = (page - 1) * perPage;
          return Promise.resolve({
            items: filtered.slice(start, start + perPage),
            page,
            perPage,
            total: filtered.length,
          });
        },
      ),
      countUnreadByUserId: jest.fn((userId: string) =>
        Promise.resolve(
          notifications.filter(
            (notification) =>
              notification.userId === userId && !notification.readAt,
          ).length,
        ),
      ),
      findById: jest.fn((id: string) =>
        Promise.resolve(
          notifications.find((notification) => notification.id === id) ?? null,
        ),
      ),
      markRead: jest.fn((id: string, readAt: Date) => {
        const index = notifications.findIndex(
          (notification) => notification.id === id,
        );
        notifications[index] = { ...notifications[index], readAt };
        return Promise.resolve(notifications[index]);
      }),
      markAllReadByUserId: jest.fn((userId: string, readAt: Date) => {
        notifications = notifications.map((notification) =>
          notification.userId === userId && !notification.readAt
            ? { ...notification, readAt }
            : notification,
        );
        return Promise.resolve();
      }),
    };
  }

  beforeEach(async () => {
    notifications = [
      {
        id: NOTIFICATION_ID,
        userId: USER_ID,
        type: 'comment.added',
        data: { cardId: 'card-1' },
        readAt: null,
        createdAt: new Date(2026, 0, 1, 10, 0),
      },
      {
        id: 'notification-2',
        userId: USER_ID,
        type: 'card.assigned.you',
        data: { cardId: 'card-2' },
        readAt: null,
        createdAt: new Date(2026, 0, 1, 11, 0),
      },
    ];

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: PrismaNotificationRepository,
          useValue: notificationRepositoryMock(),
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ApiExceptionFilter());
    app.use(
      new FakeCurrentUserMiddleware().use.bind(new FakeCurrentUserMiddleware()),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('retorna a pagina de notificacoes mais recente primeiro do proprio usuario', async () => {
    const server = app.getHttpServer();
    const response = await request(server)
      .get('/notifications')
      .set('x-current-user-id', USER_ID);

    const body = response.body as { items: { type: string }[]; total: number };

    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(2);
    expect(body.items[0].type).toBe('card.assigned.you');
    expect(body.total).toBe(2);
  });

  it('retorna a contagem de nao lidas do proprio usuario', async () => {
    const server = app.getHttpServer();
    const response = await request(server)
      .get('/notifications/unread-count')
      .set('x-current-user-id', USER_ID);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ count: 2 });
  });

  it('marca uma notificacao como lida', async () => {
    const server = app.getHttpServer();
    const response = await request(server)
      .patch(`/notifications/${NOTIFICATION_ID}/read`)
      .set('x-current-user-id', USER_ID);

    const body = response.body as { readAt: string | null };

    expect(response.status).toBe(200);
    expect(body.readAt).not.toBeNull();
  });

  it('retorna 404 ao marcar como lida notificacao de outro usuario', async () => {
    const server = app.getHttpServer();
    const response = await request(server)
      .patch(`/notifications/${NOTIFICATION_ID}/read`)
      .set('x-current-user-id', OTHER_USER_ID);

    expect(response.status).toBe(404);
  });

  it('marca todas as notificacoes do usuario como lidas', async () => {
    const server = app.getHttpServer();
    const response = await request(server)
      .post('/notifications/read-all')
      .set('x-current-user-id', USER_ID);

    expect(response.status).toBe(204);

    const unreadResponse = await request(server)
      .get('/notifications/unread-count')
      .set('x-current-user-id', USER_ID);

    expect(unreadResponse.body).toEqual({ count: 0 });
  });
});
