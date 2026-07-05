import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { RegisterUser, type RegisterUserIn } from '@taskboard/auth';
import { Public } from '../../shared/decorators';
import { BcryptCryptoProvider } from './bcrypt.crypto';
import { PrismaUserRepository } from './user.prisma';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly userRepository: PrismaUserRepository,
    private readonly cryptoProvider: BcryptCryptoProvider,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(201)
  async register(@Body() body: RegisterUserIn): Promise<void> {
    const useCase = new RegisterUser(this.userRepository, this.cryptoProvider);

    await useCase.execute(body);
  }
}
