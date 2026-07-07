import { Injectable } from '@nestjs/common';
import { ChecklistItem, ChecklistItemRepository } from '@taskboard/board';
import { PrismaService } from '../../db/prisma.service';

type PersistedChecklistItem = {
  id: string;
  cardId: string;
  text: string;
  done: boolean;
  position: number;
  createdAt: Date;
};

@Injectable()
export class PrismaChecklistItemRepository implements ChecklistItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(item: ChecklistItem): Promise<ChecklistItem> {
    const created = await this.prisma.checklistItem.create({
      data: this.toPersistence(item),
    });

    return this.toDomain(created);
  }

  async findById(id: string): Promise<ChecklistItem | null> {
    const found = await this.prisma.checklistItem.findUnique({
      where: { id },
    });

    return found ? this.toDomain(found) : null;
  }

  async findAllByCardId(cardId: string): Promise<ChecklistItem[]> {
    const found = await this.prisma.checklistItem.findMany({
      where: { cardId },
      orderBy: { position: 'asc' },
    });

    return found.map((item) => this.toDomain(item));
  }

  async findAllByCardIds(
    cardIds: string[],
  ): Promise<Record<string, ChecklistItem[]>> {
    const result: Record<string, ChecklistItem[]> = {};
    for (const cardId of cardIds) {
      result[cardId] = [];
    }

    if (cardIds.length === 0) {
      return result;
    }

    const found = await this.prisma.checklistItem.findMany({
      where: { cardId: { in: cardIds } },
      orderBy: { position: 'asc' },
    });

    for (const item of found) {
      const domainItem = this.toDomain(item);
      result[item.cardId] = [...(result[item.cardId] ?? []), domainItem];
    }

    return result;
  }

  async update(item: ChecklistItem): Promise<ChecklistItem> {
    const updated = await this.prisma.checklistItem.update({
      where: { id: item.id },
      data: {
        text: item.text,
        done: item.done,
        position: item.position,
      },
    });

    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.checklistItem.delete({ where: { id } });
  }

  private toPersistence(item: ChecklistItem) {
    return {
      id: item.id,
      cardId: item.cardId,
      text: item.text,
      done: item.done,
      position: item.position,
    };
  }

  private toDomain(raw: PersistedChecklistItem): ChecklistItem {
    return new ChecklistItem({
      id: raw.id,
      createdAt: raw.createdAt,
      cardId: raw.cardId,
      text: raw.text,
      done: raw.done,
      position: raw.position,
    });
  }
}
