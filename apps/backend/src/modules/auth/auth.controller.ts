import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import {
  LoginUser,
  RegisterUser,
  type LoginUserIn,
  type RegisterUserIn,
} from '@taskboard/auth';
import { Public } from '../../shared/decorators';
import { BcryptCryptoProvider } from './bcrypt.crypto';
import { signUserToken } from './jwt.util';
import { PrismaUserRepository } from './user.prisma';

const AUTH_THROTTLE_TTL_MS = Number(process.env.THROTTLE_AUTH_TTL ?? 60) * 1000;
const AUTH_THROTTLE_LIMIT = Number(process.env.THROTTLE_AUTH_LIMIT ?? 5);

@Controller('auth')
export class AuthController {
  constructor(
    private readonly userRepository: PrismaUserRepository,
    private readonly cryptoProvider: BcryptCryptoProvider,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Throttle({
    default: { ttl: AUTH_THROTTLE_TTL_MS, limit: AUTH_THROTTLE_LIMIT },
  })
  @Post('register')
  @HttpCode(201)
  async register(@Body() body: RegisterUserIn): Promise<void> {
    const useCase = new RegisterUser(this.userRepository, this.cryptoProvider);

    await useCase.execute(body);
  }

  @Public()
  @Throttle({
    default: { ttl: AUTH_THROTTLE_TTL_MS, limit: AUTH_THROTTLE_LIMIT },
  })
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginUserIn): Promise<{
    token: string;
    user: { id: string; name: string; email: string };
  }> {
    const useCase = new LoginUser(this.userRepository, this.cryptoProvider);

    const user = await useCase.execute(body);
    const secret = this.configService.getOrThrow<string>('JWT_SECRET');
    const token = signUserToken(user, secret);

    return { token, user };
  }
}
