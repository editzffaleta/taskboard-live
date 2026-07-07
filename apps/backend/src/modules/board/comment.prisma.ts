import { Injectable } from '@nestjs/common';
import { Comment, CommentRepository } from '@taskboard/board';
import { PrismaService } from '../../db/prisma.service';

type PersistedComment = {
  id: string;
  cardId: string;
  authorId: string;
  text: string;
  createdAt: Date;
};

@Injectable()
export class PrismaCommentRepository implements CommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(comment: Comment): Promise<Comment> {
    const created = await this.prisma.comment.create({
      data: this.toPersistence(comment),
    });

    return this.toDomain(created);
  }

  async findById(id: string): Promise<Comment | null> {
    const found = await this.prisma.comment.findUnique({ where: { id } });

    return found ? this.toDomain(found) : null;
  }

  async findAllByCardId(
    cardId: string,
    page: number,
    pageSize: number,
  ): Promise<Comment[]> {
    const found = await this.prisma.comment.findMany({
      where: { cardId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return found.map((item) => this.toDomain(item));
  }

  async countByCardId(cardId: string): Promise<number> {
    return this.prisma.comment.count({ where: { cardId } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.comment.delete({ where: { id } });
  }

  private toPersistence(comment: Comment) {
    return {
      id: comment.id,
      cardId: comment.cardId,
      authorId: comment.authorId,
      text: comment.text,
    };
  }

  private toDomain(raw: PersistedComment): Comment {
    return new Comment({
      id: raw.id,
      createdAt: raw.createdAt,
      cardId: raw.cardId,
      authorId: raw.authorId,
      text: raw.text,
    });
  }
}
