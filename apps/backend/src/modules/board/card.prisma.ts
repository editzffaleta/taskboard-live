import { Injectable } from '@nestjs/common';
import { Card, CardRepository } from '@taskboard/board';
import { PrismaService } from '../../db/prisma.service';

type PersistedCard = {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  position: number;
  dueDate: Date | null;
  createdAt: Date;
  archivedAt: Date | null;
};

@Injectable()
export class PrismaCardRepository implements CardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(card: Card): Promise<Card> {
    const created = await this.prisma.card.create({
      data: this.toPersistence(card),
    });

    return this.toDomain(created);
  }

  async findById(id: string): Promise<Card | null> {
    const found = await this.prisma.card.findUnique({ where: { id } });

    return found ? this.toDomain(found) : null;
  }

  async findAllByListId(listId: string): Promise<Card[]> {
    const found = await this.prisma.card.findMany({
      where: { listId, archivedAt: null },
      orderBy: { position: 'asc' },
    });

    return found.map((item) => this.toDomain(item));
  }

  async update(card: Card): Promise<Card> {
    const updated = await this.prisma.card.update({
      where: { id: card.id },
      data: {
        title: card.title,
        description: card.description,
        position: card.position,
        dueDate: card.dueDate,
      },
    });

    return this.toDomain(updated);
  }

  async updatePositions(
    updates: { id: string; listId: string; position: number }[],
  ): Promise<void> {
    await this.prisma.$transaction(
      updates.map((update) =>
        this.prisma.card.update({
          where: { id: update.id },
          data: { listId: update.listId, position: update.position },
        }),
      ),
    );
  }

  async delete(id: string): Promise<void> {
    await this.prisma.card.delete({ where: { id } });
  }

  async archive(id: string, archivedAt: Date): Promise<void> {
    await this.prisma.card.update({ where: { id }, data: { archivedAt } });
  }

  async restore(id: string): Promise<void> {
    await this.prisma.card.update({
      where: { id },
      data: { archivedAt: null },
    });
  }

  async findAllArchivedByBoardId(boardId: string): Promise<Card[]> {
    const found = await this.prisma.card.findMany({
      where: { archivedAt: { not: null }, list: { boardId } },
      orderBy: { position: 'asc' },
    });

    return found.map((item) => this.toDomain(item));
  }

  private toPersistence(card: Card) {
    return {
      id: card.id,
      listId: card.listId,
      title: card.title,
      description: card.description,
      position: card.position,
      dueDate: card.dueDate,
    };
  }

  private toDomain(raw: PersistedCard): Card {
    return new Card({
      id: raw.id,
      createdAt: raw.createdAt,
      listId: raw.listId,
      title: raw.title,
      description: raw.description,
      position: raw.position,
      dueDate: raw.dueDate,
      archivedAt: raw.archivedAt,
    });
  }
}
