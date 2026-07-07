import { AddressInfo } from 'net';
import http from 'http';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { sign } from 'jsonwebtoken';
import { io, Socket as ClientSocket } from 'socket.io-client';
import { PrismaMembershipRepository } from '../membership.prisma';
import { BoardGateway } from './board.gateway';
import { PresenceTracker } from './presence.tracker';
import { RealtimeEmitterImpl } from './realtime-emitter.provider';

const JWT_SECRET = 'test-secret-006';
const BOARD_ID = 'board-1';

function signToken(userId: string, name = 'Usuário Teste'): string {
  return sign({ sub: userId, name }, JWT_SECRET, { expiresIn: '1h' });
}

type PresenceUpdatePayload = {
  boardId: string;
  users: Array<{ id: string; name?: string }>;
};

type BoardErrorPayload = {
  event: string;
  code: string;
};

describe('BoardGateway (integração)', () => {
  let app: INestApplication;
  let membershipRepository: { findByBoardAndUser: jest.Mock };
  let realtimeEmitter: RealtimeEmitterImpl;
  let port: number;

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;

    membershipRepository = {
      findByBoardAndUser: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        BoardGateway,
        PresenceTracker,
        RealtimeEmitterImpl,
        {
          provide: PrismaMembershipRepository,
          useValue: membershipRepository,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    realtimeEmitter = moduleRef.get(RealtimeEmitterImpl);
    await app.listen(0);
    const address = (
      app.getHttpServer() as { address(): AddressInfo }
    ).address();
    port = address.port;
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    membershipRepository.findByBoardAndUser.mockReset();
  });

  function connect(token?: string): ClientSocket {
    return io(`http://localhost:${port}`, {
      transports: ['websocket'],
      autoConnect: true,
      forceNew: true,
      reconnection: false,
      auth: token ? { token } : {},
    });
  }

  /**
   * O middleware `cors` do engine.io não recusa a conexão a nível de servidor: ele apenas
   * omite/nao reflete o header `Access-Control-Allow-Origin`, e é o navegador quem bloqueia a
   * leitura da resposta para origens não permitidas. Por isso o teste de rejeição de origem
   * verifica o header de resposta do handshake HTTP, em vez de esperar uma falha de conexão do
   * cliente Node (que, diferente de um browser, ignora o CORS).
   */
  function handshakeOriginHeader(origin: string): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
      const req = http.get(
        {
          port,
          path: '/socket.io/?EIO=4&transport=polling',
          headers: { origin },
        },
        (res) => {
          resolve(res.headers['access-control-allow-origin']);
          res.resume();
        },
      );
      req.on('error', reject);
    });
  }

  it('reflete apenas a origem configurada em CORS_ORIGIN no handshake', async () => {
    const allowed = await handshakeOriginHeader('http://localhost:3000');
    expect(allowed).toBe('http://localhost:3000');

    const disallowed = await handshakeOriginHeader(
      'https://origem-nao-permitida.example.com',
    );
    expect(disallowed).not.toBe('https://origem-nao-permitida.example.com');
    expect(disallowed).toBe('http://localhost:3000');
  });

  it('recusa conexão sem token', (done) => {
    const client = connect();
    let finished = false;

    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      client.close();
      done(error);
    };

    client.once('disconnect', () => finish());
    client.once('connect_error', () => finish());
  });

  it('nega board:join para usuário não-membro', (done) => {
    membershipRepository.findByBoardAndUser.mockResolvedValue(null);
    const token = signToken('user-nao-membro');
    const client = connect(token);

    client.on('connect', () => {
      client.emit('board:join', { boardId: BOARD_ID });
    });

    client.on('board:error', (payload: BoardErrorPayload) => {
      expect(payload).toEqual({
        event: 'board:join',
        code: 'board.member.forbidden',
      });
      client.close();
      done();
    });

    client.on('presence.update', () => {
      client.close();
      done(new Error('não deveria receber presence.update'));
    });
  });

  it('permite board:join para membro e recebe presence.update', (done) => {
    membershipRepository.findByBoardAndUser.mockResolvedValue({
      id: 'membership-1',
      boardId: BOARD_ID,
      userId: 'user-membro',
      role: 'member',
    });
    const token = signToken('user-membro', 'Membro Teste');
    const client = connect(token);

    client.on('connect', () => {
      client.emit('board:join', { boardId: BOARD_ID });
    });

    client.on('presence.update', (payload: PresenceUpdatePayload) => {
      expect(payload.boardId).toBe(BOARD_ID);
      expect(payload.users).toEqual([
        { id: 'user-membro', name: 'Membro Teste' },
      ]);
      client.close();
      done();
    });

    client.on('board:error', () => {
      client.close();
      done(new Error('não deveria ser negado'));
    });
  });

  it('dedup de presença: múltiplos sockets do mesmo usuário contam uma vez', async () => {
    membershipRepository.findByBoardAndUser.mockResolvedValue({
      id: 'membership-2',
      boardId: BOARD_ID,
      userId: 'user-multi',
      role: 'member',
    });
    const token = signToken('user-multi', 'Multi Aba');

    const clientA = connect(token);

    await new Promise<void>((resolve) => {
      clientA.on('connect', () =>
        clientA.emit('board:join', { boardId: BOARD_ID }),
      );
      clientA.once('presence.update', () => resolve());
    });

    const clientB = connect(token);
    let lastUpdateOnB: PresenceUpdatePayload | undefined;
    clientB.on('presence.update', (payload: PresenceUpdatePayload) => {
      lastUpdateOnB = payload;
    });

    await new Promise<void>((resolve) => {
      clientB.on('connect', () =>
        clientB.emit('board:join', { boardId: BOARD_ID }),
      );
      clientB.once('presence.update', () => resolve());
    });

    expect(lastUpdateOnB?.users).toEqual([
      { id: 'user-multi', name: 'Multi Aba' },
    ]);

    await new Promise<void>((resolve) => {
      clientB.once('presence.update', (payload: PresenceUpdatePayload) => {
        lastUpdateOnB = payload;
        resolve();
      });
      clientA.close();
    });

    expect(lastUpdateOnB?.users).toEqual([
      { id: 'user-multi', name: 'Multi Aba' },
    ]);

    await new Promise<void>((resolve) => {
      clientB.on('disconnect', () => resolve());
      clientB.close();
    });
  }, 10000);

  it('entra automaticamente na sala user:{userId} e recebe emitToUser (change 024)', (done) => {
    const token = signToken('user-notificacoes');
    const client = connect(token);

    client.on('connect', () => {
      realtimeEmitter.emitToUser('user-notificacoes', 'evento.teste', {
        ok: true,
      });
    });

    client.on('evento.teste', (payload: { ok: boolean }) => {
      expect(payload).toEqual({ ok: true });
      client.close();
      done();
    });
  });
});
