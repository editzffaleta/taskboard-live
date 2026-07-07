import { Module, forwardRef } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { BoardModule } from '../board/board.module';
import { AuthController } from './auth.controller';
import { BcryptCryptoProvider } from './bcrypt.crypto';
import { PrismaUserRepository } from './user.prisma';

@Module({
  imports: [DbModule, forwardRef(() => BoardModule)],
  controllers: [AuthController],
  providers: [PrismaUserRepository, BcryptCryptoProvider],
  exports: [PrismaUserRepository, BcryptCryptoProvider],
})
export class AuthModule {}
