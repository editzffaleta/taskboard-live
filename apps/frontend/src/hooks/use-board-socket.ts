'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

export type CardEventPayload = {
  card: {
    id: string;
    listId: string;
    title: string;
    description: string | null;
    position: number;
    createdAt: string;
  };
};

export type CardMovedPayload = {
  cardId: string;
  fromListId: string;
  toListId: string;
  position: number;
};

export type CardDeletedPayload = {
  cardId: string;
  listId: string;
};

export type ListEventPayload = {
  id: string;
  boardId: string;
  title: string;
  position: number;
  createdAt: string;
};

export type ListMovedPayload = {
  lists: ListEventPayload[];
};

export type ListDeletedPayload = {
  listId: string;
};

export type PresenceUser = {
  id: string;
  name?: string;
};

export type PresencePayload = {
  boardId: string;
  users: PresenceUser[];
};

export type BoardSocketHandlers = {
  onCardCreated?: (payload: CardEventPayload) => void;
  onCardUpdated?: (payload: CardEventPayload) => void;
  onCardMoved?: (payload: CardMovedPayload) => void;
  onCardDeleted?: (payload: CardDeletedPayload) => void;
  onListCreated?: (payload: ListEventPayload) => void;
  onListUpdated?: (payload: ListEventPayload) => void;
  onListMoved?: (payload: ListMovedPayload) => void;
  onListDeleted?: (payload: ListDeletedPayload) => void;
  onMemberAdded?: (payload: unknown) => void; // gancho para 010
  onPresenceUpdate?: (payload: PresencePayload) => void;
  onActivityAppended?: (payload: unknown) => void; // gancho reservado para 011
};

export type UseBoardSocketResult = {
  connected: boolean;
};

/**
 * Conecta ao gateway Socket.IO do quadro, entra na sala `board:{boardId}` e assina os
 * eventos de domínio, repassando cada um para o handler opcional correspondente.
 * Reconecta automaticamente (backoff nativo do socket.io-client) e reemite `board:join`.
 */
export function useBoardSocket(
  boardId: string | null,
  token: string | null,
  handlers: BoardSocketHandlers,
): UseBoardSocketResult {
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!boardId || !token) {
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const socket: Socket = io(apiUrl, {
      auth: { token },
    });

    const joinBoard = () => {
      socket.emit('board:join', { boardId });
    };

    socket.on('connect', () => {
      setConnected(true);
      joinBoard();
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', () => {
      setConnected(false);
    });

    socket.on('card.created', (payload: CardEventPayload) => {
      handlersRef.current.onCardCreated?.(payload);
    });
    socket.on('card.updated', (payload: CardEventPayload) => {
      handlersRef.current.onCardUpdated?.(payload);
    });
    socket.on('card.moved', (payload: CardMovedPayload) => {
      handlersRef.current.onCardMoved?.(payload);
    });
    socket.on('card.deleted', (payload: CardDeletedPayload) => {
      handlersRef.current.onCardDeleted?.(payload);
    });
    socket.on('list.created', (payload: ListEventPayload) => {
      handlersRef.current.onListCreated?.(payload);
    });
    socket.on('list.updated', (payload: ListEventPayload) => {
      handlersRef.current.onListUpdated?.(payload);
    });
    socket.on('list.moved', (payload: ListMovedPayload) => {
      handlersRef.current.onListMoved?.(payload);
    });
    socket.on('list.deleted', (payload: ListDeletedPayload) => {
      handlersRef.current.onListDeleted?.(payload);
    });
    socket.on('member.added', (payload: unknown) => {
      handlersRef.current.onMemberAdded?.(payload);
    });
    socket.on('presence.update', (payload: PresencePayload) => {
      handlersRef.current.onPresenceUpdate?.(payload);
    });
    socket.on('activity.created', (payload: unknown) => {
      handlersRef.current.onActivityAppended?.(payload);
    });

    return () => {
      socket.emit('board:leave', { boardId });
      socket.disconnect();
      setConnected(false);
    };
  }, [boardId, token]);

  return { connected };
}
