import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { BoardController } from './board.controller';
import { PrismaBoardRepository } from './board.prisma';
import { PrismaMembershipRepository } from './membership.prisma';

@Module({
  imports: [DbModule],
  controllers: [BoardController],
  providers: [PrismaBoardRepository, PrismaMembershipRepository],
  exports: [PrismaBoardRepository, PrismaMembershipRepository],
})
export class BoardModule {}
