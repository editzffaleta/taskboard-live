import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { AddMember, ListMembers, RemoveMember } from '@taskboard/board';
import { CurrentUser } from '../../shared/decorators';
import { PrismaMembershipRepository } from './membership.prisma';
import { MemberDirectoryAdapter } from './member-directory.provider';
import { RealtimeEmitterImpl } from './realtime/realtime-emitter.provider';

type MemberResponse = {
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'member';
};

@Controller('boards/:boardId/members')
export class MembersController {
  constructor(
    private readonly membershipRepository: PrismaMembershipRepository,
    private readonly memberDirectory: MemberDirectoryAdapter,
    private readonly realtimeEmitter: RealtimeEmitterImpl,
  ) {}

  @Get()
  async list(
    @Param('boardId') boardId: string,
    @CurrentUser('id') requesterId: string,
  ): Promise<MemberResponse[]> {
    const useCase = new ListMembers(
      this.membershipRepository,
      this.memberDirectory,
    );

    const { members } = await useCase.execute({ boardId, requesterId });

    return members;
  }

  @Post()
  @HttpCode(201)
  async add(
    @Param('boardId') boardId: string,
    @Body() body: { email: string },
    @CurrentUser('id') requesterId: string,
  ): Promise<MemberResponse> {
    const useCase = new AddMember(
      this.membershipRepository,
      this.memberDirectory,
    );

    const { member } = await useCase.execute({
      boardId,
      requesterId,
      email: body.email,
    });

    this.realtimeEmitter.emitToBoard(boardId, 'member.added', {
      boardId,
      user: { id: member.id, name: member.name, email: member.email },
      role: member.role,
    });

    return {
      userId: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
    };
  }

  @Delete(':userId')
  @HttpCode(204)
  async remove(
    @Param('boardId') boardId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('id') requesterId: string,
  ): Promise<void> {
    const useCase = new RemoveMember(this.membershipRepository);

    await useCase.execute({ boardId, requesterId, targetUserId });
  }
}
