import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AcceptInvitation,
  CreateInvitation,
  GetInvitationPreview,
} from '@taskboard/board';
import { CurrentUser, Public } from '../../shared/decorators';
import { PrismaInvitationRepository } from './invitation.prisma';
import { PrismaMembershipRepository } from './membership.prisma';
import { PrismaBoardRepository } from './board.prisma';
import { MemberDirectoryAdapter } from './member-directory.provider';
import { RealtimeEmitterImpl } from './realtime/realtime-emitter.provider';

type CreateInvitationResponse = {
  id: string;
  email: string;
  token: string;
  status: 'pending' | 'accepted' | 'revoked';
  link: string;
};

type InvitationPreviewResponse = {
  boardName: string;
  invitedByName: string;
  email: string;
  status: 'pending' | 'accepted' | 'revoked';
};

type AcceptInvitationResponse = {
  boardId: string;
  memberCreated: boolean;
};

@Controller()
export class InvitationsController {
  constructor(
    private readonly invitationRepository: PrismaInvitationRepository,
    private readonly membershipRepository: PrismaMembershipRepository,
    private readonly boardRepository: PrismaBoardRepository,
    private readonly memberDirectory: MemberDirectoryAdapter,
    private readonly realtimeEmitter: RealtimeEmitterImpl,
    private readonly configService: ConfigService,
  ) {}

  @Post('boards/:boardId/invitations')
  @HttpCode(201)
  async create(
    @Param('boardId') boardId: string,
    @Body() body: { email: string },
    @CurrentUser('id') requesterId: string,
  ): Promise<CreateInvitationResponse> {
    const useCase = new CreateInvitation(
      this.invitationRepository,
      this.membershipRepository,
      this.memberDirectory,
    );

    const { invitation } = await useCase.execute({
      boardId,
      requesterId,
      email: body.email,
    });

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    return {
      id: invitation.id,
      email: invitation.email,
      token: invitation.token,
      status: invitation.status,
      link: `${frontendUrl}/convite/${invitation.token}`,
    };
  }

  @Public()
  @Get('invitations/:token')
  async preview(
    @Param('token') token: string,
  ): Promise<InvitationPreviewResponse> {
    const useCase = new GetInvitationPreview(
      this.invitationRepository,
      this.boardRepository,
      this.memberDirectory,
    );

    return useCase.execute({ token });
  }

  @Post('invitations/:token/accept')
  async accept(
    @Param('token') token: string,
    @CurrentUser('id') currentUserId: string,
  ): Promise<AcceptInvitationResponse> {
    const useCase = new AcceptInvitation(
      this.invitationRepository,
      this.membershipRepository,
      this.memberDirectory,
    );

    const { boardId, memberCreated, member } = await useCase.execute({
      token,
      currentUserId,
    });

    if (memberCreated) {
      this.realtimeEmitter.emitToBoard(boardId, 'member.added', {
        boardId,
        user: { id: member.id, name: member.name, email: member.email },
        role: member.role,
      });
    }

    return { boardId, memberCreated };
  }
}
