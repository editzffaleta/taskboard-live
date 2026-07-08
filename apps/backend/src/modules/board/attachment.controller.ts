import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  AddAttachment,
  DeleteAttachment,
  DownloadAttachment,
  ListAttachments,
  MAX_ATTACHMENT_SIZE_BYTES,
} from '@taskboard/board';
import { CurrentUser } from '../../shared/decorators';
import { PrismaCardRepository } from './card.prisma';
import { PrismaListRepository } from './list.prisma';
import { PrismaMembershipRepository } from './membership.prisma';
import {
  PrismaCardLabelRepository,
  PrismaLabelRepository,
} from './label.prisma';
import { PrismaChecklistItemRepository } from './checklist-item.prisma';
import { PrismaCardAssigneeRepository } from './card-assignee.prisma';
import { PrismaAttachmentRepository } from './attachment.prisma';
import { LocalDiskStorage } from './local-disk-storage.provider';
import { MemberDirectoryAdapter } from './member-directory.provider';
import { RealtimeEmitterImpl } from './realtime/realtime-emitter.provider';
import { buildCardResponse, type CardResponse } from './card-response.util';

export type AttachmentUploaderResponse = {
  id: string;
  name: string;
};

export type AttachmentResponse = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  uploadedBy: AttachmentUploaderResponse;
};

type UploadedMulterFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Controller('boards/:boardId/cards/:cardId/attachments')
export class AttachmentController {
  constructor(
    private readonly attachmentRepository: PrismaAttachmentRepository,
    private readonly storageProvider: LocalDiskStorage,
    private readonly cardRepository: PrismaCardRepository,
    private readonly listRepository: PrismaListRepository,
    private readonly membershipRepository: PrismaMembershipRepository,
    private readonly cardLabelRepository: PrismaCardLabelRepository,
    private readonly labelRepository: PrismaLabelRepository,
    private readonly checklistItemRepository: PrismaChecklistItemRepository,
    private readonly cardAssigneeRepository: PrismaCardAssigneeRepository,
    private readonly memberDirectory: MemberDirectoryAdapter,
    private readonly realtimeEmitter: RealtimeEmitterImpl,
  ) {}

  @Post()
  @HttpCode(201)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES },
    }),
  )
  async add(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @UploadedFile() file: UploadedMulterFile | undefined,
    @CurrentUser('id') uploadedById: string,
  ): Promise<AttachmentResponse> {
    if (!file) {
      throw new BadRequestException('attachment.file.required');
    }

    const useCase = new AddAttachment(
      this.attachmentRepository,
      this.storageProvider,
      this.cardRepository,
      this.listRepository,
      this.membershipRepository,
    );

    const { attachment } = await useCase.execute({
      boardId,
      cardId,
      uploadedById,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    });

    const response = await this.toResponse(attachment);

    await this.emitCardUpdated(boardId, cardId);

    return response;
  }

  @Get()
  async list(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @CurrentUser('id') requesterId: string,
  ): Promise<AttachmentResponse[]> {
    const useCase = new ListAttachments(
      this.attachmentRepository,
      this.cardRepository,
      this.listRepository,
      this.membershipRepository,
    );

    const { attachments } = await useCase.execute({
      boardId,
      cardId,
      requesterId,
    });

    return Promise.all(
      attachments.map((attachment) => this.toResponse(attachment)),
    );
  }

  @Get(':id/download')
  async download(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Param('id') attachmentId: string,
    @CurrentUser('id') requesterId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const useCase = new DownloadAttachment(
      this.attachmentRepository,
      this.storageProvider,
      this.cardRepository,
      this.listRepository,
      this.membershipRepository,
    );

    const { attachment, content } = await useCase.execute({
      boardId,
      cardId,
      attachmentId,
      requesterId,
    });

    res.set({
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `attachment; filename="${attachment.filename}"`,
    });

    return new StreamableFile(content);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('boardId') boardId: string,
    @Param('cardId') cardId: string,
    @Param('id') attachmentId: string,
    @CurrentUser('id') requesterId: string,
  ): Promise<void> {
    const useCase = new DeleteAttachment(
      this.attachmentRepository,
      this.storageProvider,
      this.membershipRepository,
    );

    await useCase.execute({
      boardId,
      cardId,
      attachmentId,
      requesterId,
    });

    await this.emitCardUpdated(boardId, cardId);
  }

  private async emitCardUpdated(
    boardId: string,
    cardId: string,
  ): Promise<void> {
    const card = await this.cardRepository.findById(cardId);

    if (!card) {
      return;
    }

    const response = await buildCardResponse(
      card,
      this.cardLabelRepository,
      this.labelRepository,
      this.checklistItemRepository,
      this.cardAssigneeRepository,
      this.memberDirectory,
    );

    this.realtimeEmitter.emitToBoard(boardId, 'card.updated', {
      card: response satisfies CardResponse,
    });
  }

  private async toResponse(attachment: {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    createdAt: Date;
    uploadedById: string;
  }): Promise<AttachmentResponse> {
    const uploadedBy = await this.memberDirectory.findById(
      attachment.uploadedById,
    );

    return {
      id: attachment.id,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
      createdAt: attachment.createdAt,
      uploadedBy: {
        id: attachment.uploadedById,
        name: uploadedBy?.name ?? '',
      },
    };
  }
}
