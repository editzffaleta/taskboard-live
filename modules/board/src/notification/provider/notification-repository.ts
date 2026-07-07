import { PageResult } from "@taskboard/shared";
import { Notification } from "../model";

export interface FindAllByUserIdParams {
  userId: string;
  page: number;
  perPage: number;
}

export interface NotificationRepository {
  create(notification: Notification): Promise<Notification>;
  /**
   * Retorna a página de notificações do usuário ordenadas por `createdAt`
   * decrescente (mais recente primeiro).
   */
  findAllByUserId(
    params: FindAllByUserIdParams,
  ): Promise<PageResult<Notification>>;
  countUnreadByUserId(userId: string): Promise<number>;
  findById(id: string): Promise<Notification | null>;
  markRead(id: string, readAt: Date): Promise<Notification>;
  markAllReadByUserId(userId: string, readAt: Date): Promise<void>;
}
