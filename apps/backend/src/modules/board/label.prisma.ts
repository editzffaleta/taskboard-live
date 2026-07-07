import { Injectable } from '@nestjs/common';
import {
  CardLabelRepository,
  Label,
  LabelColor,
  LabelRepository,
} from '@taskboard/board';
import { PrismaService } from '../../db/prisma.service';

type PersistedLabel = {
  id: string;
  boardId: string;
  name: string;
  color: string;
  createdAt: Date;
};

@Injectable()
export class PrismaLabelRepository implements LabelRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(label: Label): Promise<Label> {
    const created = await this.prisma.label.create({
      data: this.toPersistence(label),
    });

    return this.toDomain(created);
  }

  async findById(id: string): Promise<Label | null> {
    const found = await this.prisma.label.findUnique({ where: { id } });

    return found ? this.toDomain(found) : null;
  }

  async findAllByBoardId(boardId: string): Promise<Label[]> {
    const found = await this.prisma.label.findMany({
      where: { boardId },
      orderBy: { createdAt: 'asc' },
    });

    return found.map((item) => this.toDomain(item));
  }

  async update(label: Label): Promise<Label> {
    const updated = await this.prisma.label.update({
      where: { id: label.id },
      data: {
        name: label.name,
        color: label.color,
      },
    });

    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.label.delete({ where: { id } });
  }

  private toPersistence(label: Label) {
    return {
      id: label.id,
      boardId: label.boardId,
      name: label.name,
      color: label.color,
    };
  }

  private toDomain(raw: PersistedLabel): Label {
    return new Label({
      id: raw.id,
      createdAt: raw.createdAt,
      boardId: raw.boardId,
      name: raw.name,
      color: raw.color as LabelColor,
    });
  }
}

@Injectable()
export class PrismaCardLabelRepository implements CardLabelRepository {
  constructor(private readonly prisma: PrismaService) {}

  async assign(cardId: string, labelId: string): Promise<void> {
    await this.prisma.cardLabel.upsert({
      where: { cardId_labelId: { cardId, labelId } },
      create: { cardId, labelId },
      update: {},
    });
  }

  async unassign(cardId: string, labelId: string): Promise<void> {
    await this.prisma.cardLabel.deleteMany({ where: { cardId, labelId } });
  }

  async findAllByCardId(cardId: string): Promise<string[]> {
    const found = await this.prisma.cardLabel.findMany({
      where: { cardId },
      select: { labelId: true },
    });

    return found.map((item) => item.labelId);
  }

  async findAllByCardIds(cardIds: string[]): Promise<Record<string, string[]>> {
    const result: Record<string, string[]> = {};

    for (const cardId of cardIds) {
      result[cardId] = [];
    }

    if (cardIds.length === 0) {
      return result;
    }

    const found = await this.prisma.cardLabel.findMany({
      where: { cardId: { in: cardIds } },
      select: { cardId: true, labelId: true },
    });

    for (const item of found) {
      result[item.cardId] = [...(result[item.cardId] ?? []), item.labelId];
    }

    return result;
  }
}
