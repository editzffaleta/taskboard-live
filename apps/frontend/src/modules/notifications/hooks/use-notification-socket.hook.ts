'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { NotificationDto } from '@/modules/notifications/api/notifications.api';

/**
 * Conecta um socket de nível de aplicação (independente do `useBoardSocket`, escopado à
 * página de um quadro): o `BoardGateway` já coloca todo socket autenticado na sala
 * `user:{userId}` no handshake (`024`), então basta conectar e assinar `notification.created`
 * — sem emitir nenhum evento de subscrição do lado do cliente. Reconecta automaticamente
 * (backoff nativo do socket.io-client). Desconecta ao desmontar/trocar de token.
 */
export function useNotificationSocket(
  token: string | null,
  onNotificationCreated: (notification: NotificationDto) => void,
): void {
  const handlerRef = useRef(onNotificationCreated);

  useEffect(() => {
    handlerRef.current = onNotificationCreated;
  });

  useEffect(() => {
    if (!token) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const socket: Socket = io(apiUrl, {
      auth: { token },
    });

    socket.on('notification.created', (payload: NotificationDto) => {
      handlerRef.current(payload);
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);
}
