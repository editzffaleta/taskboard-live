/**
 * Janela curta (env de teste) para exercitar o limite estrito das rotas publicas de auth
 * sem depender de tempo real de producao. As envs precisam ser definidas ANTES do import de
 * `AuthController`, pois os limites do decorator `@Throttle` sao lidos no carregamento do modulo.
 */
const STRICT_TTL_SECONDS = 60;
const STRICT_LIMIT = 2;

process.env.THROTTLE_AUTH_TTL = String(STRICT_TTL_SECONDS);
process.env.THROTTLE_AUTH_LIMIT = String(STRICT_LIMIT);

import { INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ApiExceptionFilter } from '../../shared/errors/api-exception.filter';
import { ThrottlerI18nFilter } from '../../shared/http';
import { PrismaBoardRepository } from '../board/board.prisma';
import { PrismaMembershipRepository } from '../board/membership.prisma';
import { AuthController } from './auth.controller';
import { BcryptCryptoProvider } from './bcrypt.crypto';
import { PrismaUserRepository } from './user.prisma';

describe('AuthController — rate limit estrito (integração)', () => {
  let app: INestApplication<App>;
  let userRepository: {
    findByEmail: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(async () => {
    userRepository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ThrottlerModule.forRoot([
          { ttl: STRICT_TTL_SECONDS * 1000, limit: 100 },
        ]),
      ],
      controllers: [AuthController],
      providers: [
        { provide: PrismaUserRepository, useValue: userRepository },
        BcryptCryptoProvider,
        { provide: PrismaBoardRepository, useValue: {} },
        { provide: PrismaMembershipRepository, useValue: {} },
        { provide: APP_FILTER, useClass: ApiExceptionFilter },
        { provide: APP_FILTER, useClass: ThrottlerI18nFilter },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('bloqueia POST /auth/register com 429 apos o limite estrito', async () => {
    const server = app.getHttpServer();
    const payload = {
      name: 'Usuário Teste',
      email: 'teste@example.com',
      password: 'Str0ng!Passw0rd',
    };

    for (let i = 0; i < STRICT_LIMIT; i += 1) {
      const response = await request(server)
        .post('/auth/register')
        .send({
          ...payload,
          email: `teste-${i}@example.com`,
        });
      expect(response.status).not.toBe(429);
    }

    const blocked = await request(server)
      .post('/auth/register')
      .send({ ...payload, email: 'teste-excedente@example.com' });

    const body = blocked.body as { errors: string[] };
    expect(blocked.status).toBe(429);
    expect(body.errors).toEqual([
      expect.stringContaining('Muitas requisições'),
    ]);
  });

  it('bloqueia POST /auth/login com 429 apos o limite estrito', async () => {
    const server = app.getHttpServer();
    userRepository.findByEmail.mockResolvedValue(null);

    for (let i = 0; i < STRICT_LIMIT; i += 1) {
      const response = await request(server)
        .post('/auth/login')
        .send({ email: 'inexistente@example.com', password: 'Str0ng!Pass' });
      expect(response.status).not.toBe(429);
    }

    const blocked = await request(server)
      .post('/auth/login')
      .send({ email: 'inexistente@example.com', password: 'Str0ng!Pass' });

    expect(blocked.status).toBe(429);
  });
});
