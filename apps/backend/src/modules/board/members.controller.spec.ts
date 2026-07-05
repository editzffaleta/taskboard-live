import { INestApplication, NestMiddleware } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { ApiExceptionFilter } from '../../shared/errors/api-exception.filter';
import { MembersController } from './members.controller';
import { PrismaMembershipRepository } from './membership.prisma';
import { MemberDirectoryAdapter } from './member-directory.provider';
import { RealtimeEmitterImpl } from './realtime/realtime-emitter.provider';
import { ActivityRecorderImpl } from './activity-recorder.provider';

/**
 * Middleware de teste que simula o JwtAuthGuard: le o header
 * `x-current-user-id` e popula `request.user`, evitando subir o guard JWT
 * real (fora do escopo desta suíte de integração dos endpoints de membros).
 */
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
const OWNER_ID = 'e22fa8be-9843-4769-930a-62d4f26e5e1e';
const MEMBER_ID = '9c858901-8a57-4791-81fe-4c455b099bc9';
const NEW_USER_ID = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';

type FakeMembership = {
  boardId: string;
  userId: string;
  role: 'owner' | 'member';
};

describe('MembersController (integração HTTP)', () => {
  let app: INestApplication<App>;
  let memberships: FakeMembership[];
  let emitToBoard: jest.Mock;
  let recordActivity: jest.Mock;

  function membershipRepositoryMock() {
    return {
      findByBoardAndUser: jest.fn((boardId: string, userId: string) =>
        Promise.resolve(
          memberships.find(
            (m) => m.boardId === boardId && m.userId === userId,
          ) ?? null,
        ),
      ),
      listByBoardId: jest.fn((boardId: string) =>
        Promise.resolve(memberships.filter((m) => m.boardId === boardId)),
      ),
      create: jest.fn(
        (boardId: string, userId: string, role: 'owner' | 'member') => {
          const created = { boardId, userId, role };
          memberships.push(created);
          return Promise.resolve(created);
        },
      ),
      delete: jest.fn((boardId: string, userId: string) => {
        memberships = memberships.filter(
          (m) => !(m.boardId === boardId && m.userId === userId),
        );
        return Promise.resolve();
      }),
    };
  }

  function memberDirectoryMock() {
    return {
      findByEmail: jest.fn((email: string) => {
        if (email === 'novo@example.com') {
          return Promise.resolve({
            id: NEW_USER_ID,
            name: 'Novo Usuario',
            email,
          });
        }
        if (email === 'owner@example.com') {
          return Promise.resolve({ id: OWNER_ID, name: 'Owner', email });
        }
        return Promise.resolve(null);
      }),
      findById: jest.fn((id: string) => {
        if (id === OWNER_ID)
          return Promise.resolve({
            id,
            name: 'Owner',
            email: 'owner@example.com',
          });
        if (id === MEMBER_ID)
          return Promise.resolve({
            id,
            name: 'Membro',
            email: 'membro@example.com',
          });
        return Promise.resolve(null);
      }),
    };
  }

  beforeEach(async () => {
    memberships = [
      { boardId: BOARD_ID, userId: OWNER_ID, role: 'owner' },
      { boardId: BOARD_ID, userId: MEMBER_ID, role: 'member' },
    ];
    emitToBoard = jest.fn();
    recordActivity = jest.fn().mockResolvedValue(undefined);

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [MembersController],
      providers: [
        {
          provide: PrismaMembershipRepository,
          useValue: membershipRepositoryMock(),
        },
        { provide: MemberDirectoryAdapter, useValue: memberDirectoryMock() },
        { provide: RealtimeEmitterImpl, useValue: { emitToBoard } },
        { provide: ActivityRecorderImpl, useValue: { record: recordActivity } },
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

  it('GET lista os membros para um membro qualquer', async () => {
    const server = app.getHttpServer();
    const response = await request(server)
      .get(`/boards/${BOARD_ID}/members`)
      .set('x-current-user-id', MEMBER_ID);

    expect(response.status).toBe(200);
  });

  it('POST adiciona um membro por e-mail e emite member.added', async () => {
    const server = app.getHttpServer();
    const response = await request(server)
      .post(`/boards/${BOARD_ID}/members`)
      .set('x-current-user-id', OWNER_ID)
      .send({ email: 'novo@example.com' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      userId: NEW_USER_ID,
      email: 'novo@example.com',
      role: 'member',
    });
    expect(emitToBoard).toHaveBeenCalledWith(
      BOARD_ID,
      'member.added',
      expect.objectContaining({
        boardId: BOARD_ID,
        user: {
          id: NEW_USER_ID,
          name: 'Novo Usuario',
          email: 'novo@example.com',
        },
        role: 'member',
      }),
    );
    expect(recordActivity).toHaveBeenCalledWith(
      BOARD_ID,
      OWNER_ID,
      'member.added',
      { memberId: NEW_USER_ID, name: 'Novo Usuario' },
    );
  });

  it('POST retorna 404 quando o e-mail nao corresponde a nenhuma conta', async () => {
    const server = app.getHttpServer();
    const response = await request(server)
      .post(`/boards/${BOARD_ID}/members`)
      .set('x-current-user-id', OWNER_ID)
      .send({ email: 'inexistente@example.com' });

    expect(response.status).toBe(404);
    expect(emitToBoard).not.toHaveBeenCalled();
  });

  it('POST retorna 403 quando quem solicita nao e owner', async () => {
    const server = app.getHttpServer();
    const response = await request(server)
      .post(`/boards/${BOARD_ID}/members`)
      .set('x-current-user-id', MEMBER_ID)
      .send({ email: 'novo@example.com' });

    expect(response.status).toBe(403);
    expect(emitToBoard).not.toHaveBeenCalled();
  });

  it('DELETE remove um membro comum com 204', async () => {
    const server = app.getHttpServer();
    const response = await request(server)
      .delete(`/boards/${BOARD_ID}/members/${MEMBER_ID}`)
      .set('x-current-user-id', OWNER_ID);

    expect(response.status).toBe(204);
  });

  it('DELETE retorna 403 ao tentar remover o proprio owner', async () => {
    const server = app.getHttpServer();
    const response = await request(server)
      .delete(`/boards/${BOARD_ID}/members/${OWNER_ID}`)
      .set('x-current-user-id', OWNER_ID);

    expect(response.status).toBe(403);
  });
});
