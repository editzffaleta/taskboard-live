'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

export type LabelColor = 'red' | 'amber' | 'green' | 'blue' | 'purple' | 'teal' | 'pink';

export type LabelDto = {
  id: string;
  name: string;
  color: LabelColor;
};

export type CardEventPayload = {
  card: {
    id: string;
    listId: string;
    title: string;
    description: string | null;
    position: number;
    createdAt: string;
    labels: LabelDto[];
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

export type MemberAddedPayload = {
  boardId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  role: 'owner' | 'member';
};

export type ActivityCreatedPayload = {
  id: string;
  boardId: string;
  actorId: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: string;
};

export type LabelEventPayload = {
  label: LabelDto;
};

export type LabelDeletedPayload = {
  labelId: string;
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
  onMemberAdded?: (payload: MemberAddedPayload) => void;
  onPresenceUpdate?: (payload: PresencePayload) => void;
  onActivityAppended?: (payload: ActivityCreatedPayload) => void;
  onLabelCreated?: (payload: LabelEventPayload) => void;
  onLabelUpdated?: (payload: LabelEventPayload) => void;
  onLabelDeleted?: (payload: LabelDeletedPayload) => void;
};

export type UseBoardSocketResult = {
  connected: boolean;
  /**
   * `true` quando o socket já conectou ao menos uma vez e em seguida caiu (aguardando a
   * reconexão automática do `socket.io-client`). Distinto de "nunca conectou ainda"
   * (que só mostra `connected: false`, sem banner de reconexão).
   */
  reconnecting: boolean;
  /** Número da tentativa de reconexão em andamento, vindo nativamente do `socket.io-client`. */
  reconnectAttempt: number;
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
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const handlersRef = useRef(handlers);
  const hasConnectedOnceRef = useRef(false);

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
      hasConnectedOnceRef.current = true;
      setConnected(true);
      setReconnecting(false);
      setReconnectAttempt(0);
      joinBoard();
    });

    socket.on('disconnect', () => {
      setConnected(false);
      if (hasConnectedOnceRef.current) {
        setReconnecting(true);
      }
    });

    socket.on('connect_error', () => {
      setConnected(false);
    });

    socket.io.on('reconnect_attempt', (attempt: number) => {
      setReconnecting(true);
      setReconnectAttempt(attempt);
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
    socket.on('member.added', (payload: MemberAddedPayload) => {
      handlersRef.current.onMemberAdded?.(payload);
    });
    socket.on('presence.update', (payload: PresencePayload) => {
      handlersRef.current.onPresenceUpdate?.(payload);
    });
    socket.on('activity.created', (payload: ActivityCreatedPayload) => {
      handlersRef.current.onActivityAppended?.(payload);
    });
    socket.on('label.created', (payload: LabelEventPayload) => {
      handlersRef.current.onLabelCreated?.(payload);
    });
    socket.on('label.updated', (payload: LabelEventPayload) => {
      handlersRef.current.onLabelUpdated?.(payload);
    });
    socket.on('label.deleted', (payload: LabelDeletedPayload) => {
      handlersRef.current.onLabelDeleted?.(payload);
    });

    return () => {
      socket.emit('board:leave', { boardId });
      socket.disconnect();
      setConnected(false);
      setReconnecting(false);
      setReconnectAttempt(0);
      hasConnectedOnceRef.current = false;
    };
  }, [boardId, token]);

  return { connected, reconnecting, reconnectAttempt };
}
