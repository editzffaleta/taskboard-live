import { Injectable } from '@nestjs/common';
import { CardAssigneeRepository } from '@taskboard/board';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class PrismaCardAssigneeRepository implements CardAssigneeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async assign(cardId: string, userId: string): Promise<void> {
    await this.prisma.cardAssignee.upsert({
      where: { cardId_userId: { cardId, userId } },
      create: { cardId, userId },
      update: {},
    });
  }

  async unassign(cardId: string, userId: string): Promise<void> {
    await this.prisma.cardAssignee.deleteMany({ where: { cardId, userId } });
  }

  async findAllByCardId(cardId: string): Promise<string[]> {
    const found = await this.prisma.cardAssignee.findMany({
      where: { cardId },
      select: { userId: true },
    });

    return found.map((item) => item.userId);
  }

  async findAllByCardIds(cardIds: string[]): Promise<Record<string, string[]>> {
    const result: Record<string, string[]> = {};
    for (const cardId of cardIds) {
      result[cardId] = [];
    }

    if (cardIds.length === 0) {
      return result;
    }

    const found = await this.prisma.cardAssignee.findMany({
      where: { cardId: { in: cardIds } },
      select: { cardId: true, userId: true },
    });

    for (const item of found) {
      result[item.cardId] = [...(result[item.cardId] ?? []), item.userId];
    }

    return result;
  }
}
