import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { User } from '@taskboard/auth';
import { JwtStrategy } from './jwt.strategy';
import { PrismaUserRepository } from '../../modules/auth/user.prisma';
import { JwtPayload } from '../types/jwt-payload.type';

describe('JwtStrategy', () => {
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test-secret';
      return undefined;
    }),
  } as unknown as ConfigService;

  const userId = '11111111-1111-4111-8111-111111111111';

  const payload: JwtPayload = {
    sub: userId,
    name: 'Fulano',
    email: 'fulano@example.com',
  };

  function buildRepository(user: User | null) {
    const findById = jest.fn().mockResolvedValue(user);
    const repository = { findById } as unknown as PrismaUserRepository;
    return { repository, findById };
  }

  it('lança UnauthorizedException quando o usuário do token não existe', async () => {
    const { repository, findById } = buildRepository(null);
    const strategy = new JwtStrategy(configService, repository);

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(findById).toHaveBeenCalledWith(userId);
  });

  it('autentica normalmente quando o usuário do token existe', async () => {
    const existingUser = new User({
      id: userId,
      name: 'Fulano',
      email: 'fulano@example.com',
      password: 'hash',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    const { repository } = buildRepository(existingUser);
    const strategy = new JwtStrategy(configService, repository);

    const result = await strategy.validate(payload);

    expect(result).toEqual({
      id: userId,
      name: 'Fulano',
      email: 'fulano@example.com',
      claims: payload,
    });
  });
});
