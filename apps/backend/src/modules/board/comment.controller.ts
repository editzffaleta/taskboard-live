import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { AddComment, DeleteComment, ListComments } from '@taskboard/board';
import { CurrentUser } from '../../shared/decorators';
import { PrismaCardRepository } from './card.prisma';
import { PrismaListRepository } from './list.prisma';
import { PrismaMembershipRepository } from './membership.prisma';
import { PrismaCommentRepository } from './comment.prisma';
import { MemberDirectoryAdapter } from './member-directory.provider';
import { RealtimeEmitterImpl } from './realtime/realtime-emitter.provider';

export type CommentResponse = {
  id: string;
  cardId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: Date;
};

export type ListCommentsResponse = {
  comments: CommentResponse[];
  total: number;
  page: number;
  pageSize: number;
};

@Controller('boards/:boardId/cards/:cardId/comments')
export class CommentController {
  constructor(
    private readonly commentRepository: PrismaCommentRepository,
    private readonly cardRepository: PrismaCardRepository,
    private readonly listRepository: PrismaListRepository,
    private readonly membershipRepository: PrismaMembershipRepository,
    private readonly memberDirectory: MemberDirectoryAdapter,
    private readonly realtimeEmitter: RealtimeEmitterImpl,
  ) {}

  @Post()
  @HttpCode(201)
  async add(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Body() body: { text: string },
    @CurrentUser('id') authorId: string,
  ): Promise<CommentResponse> {
    const useCase = new AddComment(
      this.commentRepository,
      this.cardRepository,
      this.listRepository,
      this.membershipRepository,
    );

    const { comment } = await useCase.execute({
      boardId,
      cardId,
      authorId,
      text: body.text,
    });

    const response = await this.toResponse(comment);

    this.realtimeEmitter.emitToBoard(boardId, 'comment.created', {
      comment: response,
    });

    return response;
  }

  @Get()
  async list(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Query('page') page: string | undefined,
    @Query('pageSize') pageSize: string | undefined,
    @CurrentUser('id') requesterId: string,
  ): Promise<ListCommentsResponse> {
    const useCase = new ListComments(
      this.commentRepository,
      this.cardRepository,
      this.listRepository,
      this.membershipRepository,
    );

    const {
      comments,
      total,
      page: resolvedPage,
      pageSize: resolvedPageSize,
    } = await useCase.execute({
      boardId,
      cardId,
      requesterId,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });

    const responses = await Promise.all(
      comments.map((comment) => this.toResponse(comment)),
    );

    return {
      comments: responses,
      total,
      page: resolvedPage,
      pageSize: resolvedPageSize,
    };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Param('id') commentId: string,
    @CurrentUser('id') requesterId: string,
  ): Promise<void> {
    const useCase = new DeleteComment(this.commentRepository);

    const { commentId: deletedCommentId } = await useCase.execute({
      boardId,
      cardId,
      commentId,
      requesterId,
    });

    this.realtimeEmitter.emitToBoard(boardId, 'comment.deleted', {
      commentId: deletedCommentId,
      cardId,
    });
  }

  private async toResponse(comment: {
    id: string;
    cardId: string;
    authorId: string;
    text: string;
    createdAt: Date;
  }): Promise<CommentResponse> {
    const author = await this.memberDirectory.findById(comment.authorId);

    return {
      id: comment.id,
      cardId: comment.cardId,
      authorId: comment.authorId,
      authorName: author?.name ?? '',
      text: comment.text,
      createdAt: comment.createdAt,
    };
  }
}
