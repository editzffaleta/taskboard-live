import { INestApplication, NestMiddleware } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { ApiExceptionFilter } from '../../shared/errors/api-exception.filter';
import { ActivityController } from './activity.controller';
import { PrismaActivityRepository } from './activity.prisma';
import { PrismaMembershipRepository } from './membership.prisma';

class FakeCurrentUserMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const userId = req.header('x-current-user-id');
    if (userId) {
      (req as unknown as { user: { id: string } }).user = { id: userId };
    }
    next();
  }
}

const BOARD_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const OTHER_BOARD_ID = 'b4f1c1a2-4d3e-4c6f-9a9e-2f7f6a1c9d10';
const MEMBER_ID = '9c858901-8a57-4791-81fe-4c455b099bc9';
const NON_MEMBER_ID = 'e22fa8be-9843-4769-930a-62d4f26e5e1e';

type FakeActivity = {
  id: string;
  boardId: string;
  actorId: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: Date;
};

describe('ActivityController (integração HTTP)', () => {
  let app: INestApplication<App>;
  let activities: FakeActivity[];

  function activityRepositoryMock() {
    return {
      findAllByBoardId: jest.fn(
        ({
          boardId,
          page,
          perPage,
        }: {
          boardId: string;
          page: number;
          perPage: number;
        }) => {
          const filtered = activities
            .filter((activity) => activity.boardId === boardId)
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
    };
  }

  function membershipRepositoryMock() {
    return {
      findByBoardAndUser: jest.fn((boardId: string, userId: string) => {
        if (boardId === BOARD_ID && userId === MEMBER_ID) {
          return Promise.resolve({ boardId, userId, role: 'owner' });
        }
        return Promise.resolve(null);
      }),
    };
  }

  beforeEach(async () => {
    activities = [
      {
        id: 'activity-1',
        boardId: BOARD_ID,
        actorId: MEMBER_ID,
        type: 'list.created',
        data: { listId: 'list-1', title: 'A fazer' },
        createdAt: new Date(2026, 0, 1, 10, 0),
      },
      {
        id: 'activity-2',
        boardId: BOARD_ID,
        actorId: MEMBER_ID,
        type: 'card.created',
        data: { cardId: 'card-1', listId: 'list-1', title: 'Tarefa' },
        createdAt: new Date(2026, 0, 1, 11, 0),
      },
    ];

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ActivityController],
      providers: [
        {
          provide: PrismaActivityRepository,
          useValue: activityRepositoryMock(),
        },
        {
          provide: PrismaMembershipRepository,
          useValue: membershipRepositoryMock(),
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

  it('retorna a pagina de atividades mais recente primeiro para um membro', async () => {
    const server = app.getHttpServer();
    const response = await request(server)
      .get(`/boards/${BOARD_ID}/activity`)
      .set('x-current-user-id', MEMBER_ID);

    const body = response.body as {
      items: { type: string }[];
      total: number;
    };

    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(2);
    expect(body.items[0].type).toBe('card.created');
    expect(body.items[1].type).toBe('list.created');
    expect(body.total).toBe(2);
  });

  it('retorna 404 quando o requester nao e membro do quadro', async () => {
    const server = app.getHttpServer();
    const response = await request(server)
      .get(`/boards/${BOARD_ID}/activity`)
      .set('x-current-user-id', NON_MEMBER_ID);

    expect(response.status).toBe(404);
  });

  it('retorna pagina vazia para um quadro sem atividade registrada', async () => {
    const server = app.getHttpServer();
    const response = await request(server)
      .get(`/boards/${OTHER_BOARD_ID}/activity`)
      .set('x-current-user-id', NON_MEMBER_ID);

    expect(response.status).toBe(404);
  });
});
