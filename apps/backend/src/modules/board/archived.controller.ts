import { Controller, Get } from '@nestjs/common';
import { ListArchivedItems, type ListArchivedItemsOut } from '@taskboard/board';
import { CurrentUser } from '../../shared/decorators';
import { PrismaBoardRepository } from './board.prisma';
import { PrismaMembershipRepository } from './membership.prisma';
import { PrismaListRepository } from './list.prisma';
import { PrismaCardRepository } from './card.prisma';

@Controller('archived')
export class ArchivedController {
  constructor(
    private readonly boardRepository: PrismaBoardRepository,
    private readonly membershipRepository: PrismaMembershipRepository,
    private readonly listRepository: PrismaListRepository,
    private readonly cardRepository: PrismaCardRepository,
  ) {}

  @Get()
  async list(
    @CurrentUser('id') requesterId: string,
  ): Promise<ListArchivedItemsOut> {
    const useCase = new ListArchivedItems(
      this.boardRepository,
      this.membershipRepository,
      this.listRepository,
      this.cardRepository,
    );

    return useCase.execute({ requesterId });
  }
}
