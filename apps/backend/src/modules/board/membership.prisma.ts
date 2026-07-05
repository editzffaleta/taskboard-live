import { Injectable } from '@nestjs/common';
import {
  Membership,
  MembershipRepository,
  MembershipRole,
} from '@taskboard/board';
import { PrismaService } from '../../db/prisma.service';

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
export class PrismaMembershipRepository implements MembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByBoardAndUser(
    boardId: string,
    userId: string,
  ): Promise<Membership | null> {
    const found = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });

    return found ? this.toDomain(found) : null;
  }

  async listBoardsByUser(userId: string): Promise<Membership[]> {
    const found = await this.prisma.boardMember.findMany({
      where: { userId },
    });

    return found.map((item) => this.toDomain(item));
  }

  async create(
    boardId: string,
    userId: string,
    role: MembershipRole,
  ): Promise<Membership> {
    const created = await this.prisma.boardMember.create({
      data: { boardId, userId, role },
    });

    return this.toDomain(created);
  }

  private toDomain(raw: PersistedMembership): Membership {
    return new Membership({
      id: raw.id,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
      boardId: raw.boardId,
      userId: raw.userId,
      role: raw.role as MembershipRole,
    });
  }
}
