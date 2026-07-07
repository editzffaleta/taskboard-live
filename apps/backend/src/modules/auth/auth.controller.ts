import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Patch,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import {
  ChangePassword,
  DeleteAccount,
  LoginUser,
  RegisterUser,
  UpdateProfile,
  type ChangePasswordIn,
  type LoginUserIn,
  type RegisterUserIn,
  type UpdateProfileIn,
} from '@taskboard/auth';
import { PrismaBoardRepository } from '../board/board.prisma';
import { PrismaMembershipRepository } from '../board/membership.prisma';
import { CurrentUser, Public } from '../../shared/decorators';
import type { AuthenticatedUser } from '../../shared/types/current-user.type';
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
    private readonly boardRepository: PrismaBoardRepository,
    private readonly membershipRepository: PrismaMembershipRepository,
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

  @Patch('me')
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Pick<UpdateProfileIn, 'name'>,
  ): Promise<{ id: string; name: string; email: string }> {
    const useCase = new UpdateProfile(this.userRepository);

    return useCase.execute({ userId: user.id, name: body.name });
  }

  @Patch('me/password')
  @HttpCode(204)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Pick<ChangePasswordIn, 'currentPassword' | 'newPassword'>,
  ): Promise<void> {
    const useCase = new ChangePassword(
      this.userRepository,
      this.cryptoProvider,
    );

    await useCase.execute({
      userId: user.id,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });
  }

  @Delete('me')
  @HttpCode(204)
  async deleteAccount(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    const useCase = new DeleteAccount(
      this.userRepository,
      this.boardRepository,
      this.membershipRepository,
    );

    await useCase.execute({ userId: user.id });
  }
}
