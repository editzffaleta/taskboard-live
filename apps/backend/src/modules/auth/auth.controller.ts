import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

@Controller('auth')
export class AuthController {
  constructor(
    private readonly userRepository: PrismaUserRepository,
    private readonly cryptoProvider: BcryptCryptoProvider,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(201)
  async register(@Body() body: RegisterUserIn): Promise<void> {
    const useCase = new RegisterUser(this.userRepository, this.cryptoProvider);

    await useCase.execute(body);
  }

  @Public()
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
