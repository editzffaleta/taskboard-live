import { Injectable, Logger } from '@nestjs/common';
import { Notification, NotificationRecorder } from '@taskboard/board';
import { PrismaNotificationRepository } from './notification.prisma';
import { RealtimeEmitterImpl } from './realtime/realtime-emitter.provider';

/**
 * Implementação concreta de `NotificationRecorder` (porta definida em
 * `@taskboard/board`): persiste a `Notification` via
 * `PrismaNotificationRepository` e, em seguida, emite `notification.created`
 * via `RealtimeEmitter.emitToUser` para a sala individual do destinatário. A
 * notificação é auxiliar — qualquer erro é logado e nunca propagado para
 * quem chamou `record`, para não quebrar a resposta HTTP da mutação
 * original (mesmo princípio de `ActivityRecorderImpl`, `011`).
 */
@Injectable()
export class NotificationRecorderImpl implements NotificationRecorder {
  private readonly logger = new Logger(NotificationRecorderImpl.name);

  constructor(
    private readonly notificationRepository: PrismaNotificationRepository,
    private readonly realtimeEmitter: RealtimeEmitterImpl,
  ) {}

  async record(
    userId: string,
    type: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    try {
      const notification = new Notification({
        userId,
        type,
        data,
        readAt: null,
      });
      notification.validate();

      const created = await this.notificationRepository.create(notification);

      this.realtimeEmitter.emitToUser(userId, 'notification.created', {
        id: created.id,
        userId: created.userId,
        type: created.type,
        data: created.data,
        readAt: created.readAt,
        createdAt: created.createdAt,
      });
    } catch (error) {
      this.logger.error(
        `Falha ao registrar notificação "${type}" do usuário ${userId}`,
        (error as Error)?.stack,
      );
    }
  }
}
