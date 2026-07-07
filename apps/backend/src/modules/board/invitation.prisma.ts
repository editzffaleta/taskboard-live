import { Injectable } from '@nestjs/common';
import {
  CreateInvitationInput,
  Invitation,
  InvitationRepository,
  InvitationStatus,
} from '@taskboard/board';
import { PrismaService } from '../../db/prisma.service';

type PersistedInvitation = {
  id: string;
  boardId: string;
  email: string;
  token: string;
  role: string;
  status: string;
  invitedById: string;
  createdAt: Date;
};

@Injectable()
export class PrismaInvitationRepository implements InvitationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByToken(token: string): Promise<Invitation | null> {
    const found = await this.prisma.invitation.findUnique({
      where: { token },
    });

    return found ? this.toDomain(found) : null;
  }

  async findPendingByBoardAndEmail(
    boardId: string,
    email: string,
  ): Promise<Invitation | null> {
    const found = await this.prisma.invitation.findFirst({
      where: { boardId, email, status: 'pending' },
    });

    return found ? this.toDomain(found) : null;
  }

  async create(input: CreateInvitationInput): Promise<Invitation> {
    const invitation = new Invitation({
      boardId: input.boardId,
      email: input.email,
      token: input.token,
      invitedById: input.invitedById,
      role: 'member',
      status: 'pending',
    });
    invitation.validate();

    const created = await this.prisma.invitation.create({
      data: {
        boardId: invitation.boardId,
        email: invitation.email,
        token: invitation.token,
        role: invitation.role,
        status: invitation.status,
        invitedById: invitation.invitedById,
      },
    });

    return this.toDomain(created);
  }

  async markAccepted(id: string): Promise<void> {
    await this.prisma.invitation.update({
      where: { id },
      data: { status: 'accepted' },
    });
  }

  async listPendingByBoardId(boardId: string): Promise<Invitation[]> {
    const found = await this.prisma.invitation.findMany({
      where: { boardId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    return found.map((item) => this.toDomain(item));
  }

  private toDomain(raw: PersistedInvitation): Invitation {
    return new Invitation({
      id: raw.id,
      createdAt: raw.createdAt,
      boardId: raw.boardId,
      email: raw.email,
      token: raw.token,
      role: raw.role as 'member',
      status: raw.status as InvitationStatus,
      invitedById: raw.invitedById,
    });
  }
}
