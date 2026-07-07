import { Injectable } from '@nestjs/common';
import {
  Board,
  BoardRepository,
  Card,
  CreateBoardFromTemplateInput,
  CreateBoardWithOwnerInput,
  List,
  Membership,
} from '@taskboard/board';
import { PrismaService } from '../../db/prisma.service';

type PersistedBoard = {
  id: string;
  name: string;
  ownerId: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  archivedAt: Date | null;
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

type PersistedList = {
  id: string;
  boardId: string;
  title: string;
  position: number;
  createdAt: Date;
  archivedAt: Date | null;
};

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

  async createFromTemplate(input: CreateBoardFromTemplateInput): Promise<{
    board: Board;
    membership: Membership;
    lists: List[];
    cards: Card[];
  }> {
    const board = new Board({ name: input.name, ownerId: input.ownerId });
    board.validate();

    const membership = new Membership({
      boardId: board.id,
      userId: input.ownerId,
      role: 'owner',
    });
    membership.validate();

    const lists: List[] = [];
    const cards: Card[] = [];

    input.lists.forEach((listInput, listIndex) => {
      const list = new List({
        boardId: board.id,
        title: listInput.title,
        position: listIndex,
      });
      list.validate();
      lists.push(list);

      listInput.cards.forEach((cardInput, cardIndex) => {
        const card = new Card({
          listId: list.id,
          title: cardInput.title,
          position: cardIndex,
        });
        card.validate();
        cards.push(card);
      });
    });

    const [createdBoard, createdMembership, ...createdRest] =
      await this.prisma.$transaction([
        this.prisma.board.create({ data: this.boardToPersistence(board) }),
        this.prisma.boardMember.create({
          data: this.membershipToPersistence(membership),
        }),
        ...lists.map((list) =>
          this.prisma.list.create({ data: this.listToPersistence(list) }),
        ),
        ...cards.map((card) =>
          this.prisma.card.create({ data: this.cardToPersistence(card) }),
        ),
      ]);

    const createdLists = createdRest.slice(0, lists.length) as PersistedList[];
    const createdCards = createdRest.slice(lists.length) as PersistedCard[];

    return {
      board: this.boardToDomain(createdBoard),
      membership: this.membershipToDomain(createdMembership),
      lists: createdLists.map((item) => this.listToDomain(item)),
      cards: createdCards.map((item) => this.cardToDomain(item)),
    };
  }

  async update(entity: Board): Promise<Board> {
    const updated = await this.prisma.board.update({
      where: { id: entity.id },
      data: { name: entity.name, color: entity.color ?? undefined },
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
      where: { id: { in: ids }, archivedAt: null },
    });

    return found.map((item) => this.boardToDomain(item));
  }

  async archive(id: string, archivedAt: Date): Promise<void> {
    await this.prisma.board.update({ where: { id }, data: { archivedAt } });
  }

  async restore(id: string): Promise<void> {
    await this.prisma.board.update({
      where: { id },
      data: { archivedAt: null },
    });
  }

  async findAllArchivedByOwnerId(ownerId: string): Promise<Board[]> {
    const found = await this.prisma.board.findMany({
      where: { ownerId, archivedAt: { not: null } },
    });

    return found.map((item) => this.boardToDomain(item));
  }

  async searchByIds(
    ids: string[],
    query: string,
    limit: number,
  ): Promise<Board[]> {
    const found = await this.prisma.board.findMany({
      where: {
        id: { in: ids },
        archivedAt: null,
        name: { contains: query, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
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
      color: raw.color,
      archivedAt: raw.archivedAt,
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

  private listToPersistence(list: List) {
    return {
      id: list.id,
      boardId: list.boardId,
      title: list.title,
      position: list.position,
    };
  }

  private listToDomain(raw: PersistedList): List {
    return new List({
      id: raw.id,
      createdAt: raw.createdAt,
      boardId: raw.boardId,
      title: raw.title,
      position: raw.position,
      archivedAt: raw.archivedAt,
    });
  }

  private cardToPersistence(card: Card) {
    return {
      id: card.id,
      listId: card.listId,
      title: card.title,
      description: card.description,
      position: card.position,
      dueDate: card.dueDate,
    };
  }

  private cardToDomain(raw: PersistedCard): Card {
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
