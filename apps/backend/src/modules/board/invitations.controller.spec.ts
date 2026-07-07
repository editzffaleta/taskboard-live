import { INestApplication, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { ApiExceptionFilter } from '../../shared/errors/api-exception.filter';
import { InvitationsController } from './invitations.controller';
import { PrismaInvitationRepository } from './invitation.prisma';
import { PrismaMembershipRepository } from './membership.prisma';
import { PrismaBoardRepository } from './board.prisma';
import { MemberDirectoryAdapter } from './member-directory.provider';
import { RealtimeEmitterImpl } from './realtime/realtime-emitter.provider';

/**
 * Middleware de teste que simula o JwtAuthGuard: le o header
 * `x-current-user-id` e popula `request.user`. Como a rota de previa
 * (`GET /invitations/:token`) e `@Public()`, este middleware simplesmente nao
 * popula `request.user` quando o header nao vem, sem bloquear a rota (o
 * `JwtAuthGuard` real nao esta em uso nesta suite de integracao).
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
const INVITED_ID = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';
const OTHER_ID = '2c8d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bee';

type CreateInvitationBody = {
  id: string;
  email: string;
  token: string;
  status: 'pending' | 'accepted' | 'revoked';
  link: string;
};

function asCreateInvitationBody(body: unknown): CreateInvitationBody {
  return body as CreateInvitationBody;
}

type FakeMembership = {
  boardId: string;
  userId: string;
  role: 'owner' | 'member';
};
type FakeInvitation = {
  id: string;
  boardId: string;
  email: string;
  token: string;
  role: 'member';
  status: 'pending' | 'accepted' | 'revoked';
  invitedById: string;
};

describe('InvitationsController (integração HTTP)', () => {
  let app: INestApplication<App>;
  let memberships: FakeMembership[];
  let invitations: FakeInvitation[];
  let emitToBoard: jest.Mock;
  let nextId: number;

  function membershipRepositoryMock() {
    return {
      findByBoardAndUser: jest.fn((boardId: string, userId: string) =>
        Promise.resolve(
          memberships.find(
            (m) => m.boardId === boardId && m.userId === userId,
          ) ?? null,
        ),
      ),
      create: jest.fn(
        (boardId: string, userId: string, role: 'owner' | 'member') => {
          const created = { boardId, userId, role };
          memberships.push(created);
          return Promise.resolve(created);
        },
      ),
    };
  }

  function invitationRepositoryMock() {
    return {
      findByToken: jest.fn((token: string) =>
        Promise.resolve(invitations.find((i) => i.token === token) ?? null),
      ),
      findPendingByBoardAndEmail: jest.fn((boardId: string, email: string) =>
        Promise.resolve(
          invitations.find(
            (i) =>
              i.boardId === boardId &&
              i.email === email &&
              i.status === 'pending',
          ) ?? null,
        ),
      ),
      create: jest.fn(
        (input: {
          boardId: string;
          email: string;
          token: string;
          invitedById: string;
        }) => {
          const created: FakeInvitation = {
            id: `invitation-${nextId++}`,
            boardId: input.boardId,
            email: input.email,
            token: input.token,
            role: 'member',
            status: 'pending',
            invitedById: input.invitedById,
          };
          invitations.push(created);
          return Promise.resolve(created);
        },
      ),
      markAccepted: jest.fn((id: string) => {
        const found = invitations.find((i) => i.id === id);
        if (found) found.status = 'accepted';
        return Promise.resolve();
      }),
      listPendingByBoardId: jest.fn((boardId: string) =>
        Promise.resolve(
          invitations.filter(
            (i) => i.boardId === boardId && i.status === 'pending',
          ),
        ),
      ),
    };
  }

  function memberDirectoryMock() {
    return {
      findByEmail: jest.fn(() => Promise.resolve(null)),
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
        if (id === INVITED_ID)
          return Promise.resolve({
            id,
            name: 'Convidado',
            email: 'convidado@example.com',
          });
        if (id === OTHER_ID)
          return Promise.resolve({
            id,
            name: 'Outro',
            email: 'outro@example.com',
          });
        return Promise.resolve(null);
      }),
    };
  }

  beforeEach(async () => {
    memberships = [{ boardId: BOARD_ID, userId: OWNER_ID, role: 'owner' }];
    invitations = [];
    nextId = 1;
    emitToBoard = jest.fn();

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [InvitationsController],
      providers: [
        {
          provide: PrismaInvitationRepository,
          useValue: invitationRepositoryMock(),
        },
        {
          provide: PrismaMembershipRepository,
          useValue: membershipRepositoryMock(),
        },
        {
          provide: PrismaBoardRepository,
          useValue: {
            findById: jest.fn(() =>
              Promise.resolve({ id: BOARD_ID, name: 'Quadro Teste' }),
            ),
          },
        },
        { provide: MemberDirectoryAdapter, useValue: memberDirectoryMock() },
        { provide: RealtimeEmitterImpl, useValue: { emitToBoard } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => 'http://localhost:3000') },
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

  it('POST cria convite e retorna o token/link', async () => {
    const server = app.getHttpServer();
    const response = await request(server)
      .post(`/boards/${BOARD_ID}/invitations`)
      .set('x-current-user-id', OWNER_ID)
      .send({ email: 'convidado@example.com' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      email: 'convidado@example.com',
      status: 'pending',
    });
    const body = asCreateInvitationBody(response.body);
    expect(body.token).toBeTruthy();
    expect(body.link).toBe(`http://localhost:3000/convite/${body.token}`);
  });

  it('POST retorna 403 quando quem solicita nao e owner', async () => {
    const server = app.getHttpServer();
    const response = await request(server)
      .post(`/boards/${BOARD_ID}/invitations`)
      .set('x-current-user-id', MEMBER_ID)
      .send({ email: 'convidado@example.com' });

    expect(response.status).toBe(403);
  });

  it('GET /invitations/:token responde sem exigir Authorization', async () => {
    const server = app.getHttpServer();
    const created = await request(server)
      .post(`/boards/${BOARD_ID}/invitations`)
      .set('x-current-user-id', OWNER_ID)
      .send({ email: 'convidado@example.com' });

    const token = asCreateInvitationBody(created.body).token;
    const response = await request(server).get(`/invitations/${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      boardName: 'Quadro Teste',
      invitedByName: 'Owner',
      email: 'convidado@example.com',
      status: 'pending',
    });
  });

  it('GET /invitations/:token retorna 404 para token inexistente', async () => {
    const server = app.getHttpServer();
    const response = await request(server).get('/invitations/nao-existe');

    expect(response.status).toBe(404);
  });

  it('POST /invitations/:token/accept com e-mail correto cria membro e emite member.added', async () => {
    const server = app.getHttpServer();
    const created = await request(server)
      .post(`/boards/${BOARD_ID}/invitations`)
      .set('x-current-user-id', OWNER_ID)
      .send({ email: 'convidado@example.com' });

    const token = asCreateInvitationBody(created.body).token;
    const response = await request(server)
      .post(`/invitations/${token}/accept`)
      .set('x-current-user-id', INVITED_ID);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ boardId: BOARD_ID, memberCreated: true });
    expect(emitToBoard).toHaveBeenCalledWith(
      BOARD_ID,
      'member.added',
      expect.objectContaining({
        boardId: BOARD_ID,
        user: {
          id: INVITED_ID,
          name: 'Convidado',
          email: 'convidado@example.com',
        },
        role: 'member',
      }),
    );
  });

  it('POST /invitations/:token/accept e idempotente quando o usuario ja e membro (convite ainda pending)', async () => {
    const server = app.getHttpServer();
    const created = await request(server)
      .post(`/boards/${BOARD_ID}/invitations`)
      .set('x-current-user-id', OWNER_ID)
      .send({ email: 'convidado@example.com' });

    // Simula o usuario ja tendo sido adicionado por outro caminho (ex.: add-member da 010)
    // enquanto o convite ainda esta pending.
    memberships.push({ boardId: BOARD_ID, userId: INVITED_ID, role: 'member' });

    const token = asCreateInvitationBody(created.body).token;
    const response = await request(server)
      .post(`/invitations/${token}/accept`)
      .set('x-current-user-id', INVITED_ID);

    expect(response.status).toBe(201);
    expect((response.body as { memberCreated: boolean }).memberCreated).toBe(
      false,
    );
    expect(emitToBoard).not.toHaveBeenCalled();
  });

  it('POST /invitations/:token/accept retorna 409 ao aceitar um convite ja aceito', async () => {
    const server = app.getHttpServer();
    const created = await request(server)
      .post(`/boards/${BOARD_ID}/invitations`)
      .set('x-current-user-id', OWNER_ID)
      .send({ email: 'convidado@example.com' });

    const token = asCreateInvitationBody(created.body).token;
    await request(server)
      .post(`/invitations/${token}/accept`)
      .set('x-current-user-id', INVITED_ID);
    emitToBoard.mockClear();

    const second = await request(server)
      .post(`/invitations/${token}/accept`)
      .set('x-current-user-id', INVITED_ID);

    expect(second.status).toBe(409);
    expect(emitToBoard).not.toHaveBeenCalled();
  });

  it('POST /invitations/:token/accept com e-mail divergente retorna 403', async () => {
    const server = app.getHttpServer();
    const created = await request(server)
      .post(`/boards/${BOARD_ID}/invitations`)
      .set('x-current-user-id', OWNER_ID)
      .send({ email: 'convidado@example.com' });

    const token = asCreateInvitationBody(created.body).token;
    const response = await request(server)
      .post(`/invitations/${token}/accept`)
      .set('x-current-user-id', OTHER_ID);

    expect(response.status).toBe(403);
    expect(emitToBoard).not.toHaveBeenCalled();
  });

  it('POST /invitations/:token/accept retorna 404 para token inexistente', async () => {
    const server = app.getHttpServer();
    const response = await request(server)
      .post('/invitations/nao-existe/accept')
      .set('x-current-user-id', INVITED_ID);

    expect(response.status).toBe(404);
  });
});
