import { Controller, Get, Query } from '@nestjs/common';
import { Search, type SearchOut } from '@taskboard/board';
import { CurrentUser } from '../../shared/decorators';
import { PrismaBoardRepository } from './board.prisma';
import { PrismaCardRepository } from './card.prisma';
import { PrismaMembershipRepository } from './membership.prisma';

@Controller('search')
export class SearchController {
  constructor(
    private readonly boardRepository: PrismaBoardRepository,
    private readonly cardRepository: PrismaCardRepository,
    private readonly membershipRepository: PrismaMembershipRepository,
  ) {}

  @Get()
  async search(
    @CurrentUser('id') requesterId: string,
    @Query('q') q: string,
  ): Promise<SearchOut> {
    const useCase = new Search(
      this.boardRepository,
      this.cardRepository,
      this.membershipRepository,
    );

    return useCase.execute({ requesterId, query: q ?? '' });
  }
}
