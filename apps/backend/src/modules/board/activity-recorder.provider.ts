import { Injectable, Logger } from '@nestjs/common';
import { Activity, ActivityRecorder } from '@taskboard/board';
import { PrismaActivityRepository } from './activity.prisma';
import { RealtimeEmitterImpl } from './realtime/realtime-emitter.provider';

/**
 * Implementação concreta de `ActivityRecorder` (porta definida em
 * `@taskboard/board`): persiste a `Activity` via `PrismaActivityRepository` e,
 * em seguida, emite `activity.created` via `RealtimeEmitter` para a sala do
 * quadro. A trilha de atividade é auxiliar — qualquer erro é logado e nunca
 * propagado para quem chamou `record`, para não quebrar a resposta HTTP da
 * mutação original.
 */
@Injectable()
export class ActivityRecorderImpl implements ActivityRecorder {
  private readonly logger = new Logger(ActivityRecorderImpl.name);

  constructor(
    private readonly activityRepository: PrismaActivityRepository,
    private readonly realtimeEmitter: RealtimeEmitterImpl,
  ) {}

  async record(
    boardId: string,
    actorId: string,
    type: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    try {
      const activity = new Activity({ boardId, actorId, type, data });
      activity.validate();

      const created = await this.activityRepository.create(activity);

      this.realtimeEmitter.emitToBoard(boardId, 'activity.created', {
        id: created.id,
        boardId: created.boardId,
        actorId: created.actorId,
        type: created.type,
        data: created.data,
        createdAt: created.createdAt,
      });
    } catch (error) {
      this.logger.error(
        `Falha ao registrar atividade "${type}" do quadro ${boardId}`,
        (error as Error)?.stack,
      );
    }
  }
}
