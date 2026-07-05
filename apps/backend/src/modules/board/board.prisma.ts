import { Injectable } from '@nestjs/common';
import {
  Board,
  BoardRepository,
  CreateBoardWithOwnerInput,
  Membership,
} from '@taskboard/board';
import { PrismaService } from '../../db/prisma.service';

type PersistedBoard = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type PersistedMembership = {
  id: string;
  boardId: string;
  userId: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

@Injectable()
export class PrismaBoardRepository implements BoardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createWithOwnerMembership(
    input: CreateBoardWithOwnerInput,
  ): Promise<{ board: Board; membership: Membership }> {
    const board = new Board({ name: input.name, ownerId: input.ownerId });
    board.validate();

    const membership = new Membership({
      boardId: board.id,
      userId: input.ownerId,
      role: 'owner',
    });
    membership.validate();

    const [createdBoard, createdMembership] = await this.prisma.$transaction([
      this.prisma.board.create({ data: this.boardToPersistence(board) }),
      this.prisma.boardMember.create({
        data: this.membershipToPersistence(membership),
      }),
    ]);

    return {
      board: this.boardToDomain(createdBoard),
      membership: this.membershipToDomain(createdMembership),
    };
  }

  async update(entity: Board): Promise<Board> {
    const updated = await this.prisma.board.update({
      where: { id: entity.id },
      data: { name: entity.name },
    });

    return this.boardToDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.board.delete({ where: { id } });
  }

  async findById(id: string): Promise<Board | null> {
    const found = await this.prisma.board.findUnique({ where: { id } });

    return found ? this.boardToDomain(found) : null;
  }

  async findManyByIds(ids: string[]): Promise<Board[]> {
    const found = await this.prisma.board.findMany({
      where: { id: { in: ids } },
    });

    return found.map((item) => this.boardToDomain(item));
  }

  private boardToPersistence(board: Board) {
    return {
      id: board.id,
      name: board.name,
      ownerId: board.ownerId,
    };
  }

  private membershipToPersistence(membership: Membership) {
    return {
      id: membership.id,
      boardId: membership.boardId,
      userId: membership.userId,
      role: membership.role,
    };
  }

  private boardToDomain(raw: PersistedBoard): Board {
    return new Board({
      id: raw.id,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
      name: raw.name,
      ownerId: raw.ownerId,
    });
  }

  private membershipToDomain(raw: PersistedMembership): Membership {
    return new Membership({
      id: raw.id,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
      boardId: raw.boardId,
      userId: raw.userId,
      role: raw.role as 'owner' | 'member',
    });
  }
}
