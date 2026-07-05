import { Injectable } from '@nestjs/common';
import { List, ListRepository } from '@taskboard/board';
import { PrismaService } from '../../db/prisma.service';

type PersistedList = {
  id: string;
  boardId: string;
  title: string;
  position: number;
  createdAt: Date;
};

@Injectable()
export class PrismaListRepository implements ListRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(list: List): Promise<List> {
    const created = await this.prisma.list.create({
      data: this.toPersistence(list),
    });

    return this.toDomain(created);
  }

  async findById(id: string): Promise<List | null> {
    const found = await this.prisma.list.findUnique({ where: { id } });

    return found ? this.toDomain(found) : null;
  }

  async findAllByBoardId(boardId: string): Promise<List[]> {
    const found = await this.prisma.list.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
    });

    return found.map((item) => this.toDomain(item));
  }

  async update(list: List): Promise<List> {
    const updated = await this.prisma.list.update({
      where: { id: list.id },
      data: { title: list.title, position: list.position },
    });

    return this.toDomain(updated);
  }

  async updatePositions(
    updates: { id: string; position: number }[],
  ): Promise<void> {
    await this.prisma.$transaction(
      updates.map((update) =>
        this.prisma.list.update({
          where: { id: update.id },
          data: { position: update.position },
        }),
      ),
    );
  }

  async delete(id: string): Promise<void> {
    await this.prisma.list.delete({ where: { id } });
  }

  private toPersistence(list: List) {
    return {
      id: list.id,
      boardId: list.boardId,
      title: list.title,
      position: list.position,
    };
  }

  private toDomain(raw: PersistedList): List {
    return new List({
      id: raw.id,
      createdAt: raw.createdAt,
      boardId: raw.boardId,
      title: raw.title,
      position: raw.position,
    });
  }
}
