import { Injectable } from '@nestjs/common';

export type PresenceUser = {
  id: string;
  name?: string;
};

type SocketPresence = PresenceUser & { socketId: string };

/**
 * Rastreia em memória quais usuários estão conectados a cada sala de quadro.
 * Um mesmo usuário pode ter múltiplos sockets (várias abas); a lista pública de
 * presença é sempre deduplicada por `userId`.
 */
@Injectable()
export class PresenceTracker {
  private readonly boards = new Map<string, Map<string, SocketPresence>>();

  add(boardId: string, socketId: string, user: PresenceUser): PresenceUser[] {
    const sockets =
      this.boards.get(boardId) ?? new Map<string, SocketPresence>();
    sockets.set(socketId, { ...user, socketId });
    this.boards.set(boardId, sockets);

    return this.listUsers(boardId);
  }

  remove(boardId: string, socketId: string): PresenceUser[] {
    const sockets = this.boards.get(boardId);
    if (!sockets) {
      return [];
    }

    sockets.delete(socketId);

    if (sockets.size === 0) {
      this.boards.delete(boardId);
      return [];
    }

    return this.listUsers(boardId);
  }

  removeFromAllBoards(
    socketId: string,
  ): Array<{ boardId: string; users: PresenceUser[] }> {
    const affected: Array<{ boardId: string; users: PresenceUser[] }> = [];

    for (const boardId of this.boards.keys()) {
      const sockets = this.boards.get(boardId);
      if (sockets?.has(socketId)) {
        affected.push({ boardId, users: this.remove(boardId, socketId) });
      }
    }

    return affected;
  }

  listUsers(boardId: string): PresenceUser[] {
    const sockets = this.boards.get(boardId);
    if (!sockets) {
      return [];
    }

    const uniqueById = new Map<string, PresenceUser>();
    for (const presence of sockets.values()) {
      uniqueById.set(presence.id, { id: presence.id, name: presence.name });
    }

    return Array.from(uniqueById.values());
  }
}
