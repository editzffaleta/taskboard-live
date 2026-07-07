'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/modules/auth/context/auth.context';
import { useNotificationSocket } from '@/modules/notifications/hooks/use-notification-socket.hook';
import {
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationDto,
} from '@/modules/notifications/api/notifications.api';

const PER_PAGE = 20;

type NotificationContextValue = {
  notifications: NotificationDto[];
  unreadCount: number;
  loading: boolean;
  hasMore: boolean;
  hasLoadedOnce: boolean;
  loadFirstPage: () => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

/**
 * Provider global de notificações (`024`), montado uma única vez em `PrivateGroupLayout`
 * (mesmo nível do `ShellProvider`/`CommandPalette` da `023`). Abre seu próprio socket de
 * app-level (`useNotificationSocket`) — não reaproveita a instância do `useBoardSocket`,
 * que é escopada à página de um quadro. Mescla notificações por `id` (mesmo princípio de
 * merge da `011`) para nunca duplicar entre carga REST e evento ao vivo.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { token, status } = useAuth();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (status !== 'authenticated' || !token) {
      // Reseta o contador ao deslogar — não há "sincronização externa" aqui além de
      // limpar o estado local quando a sessão deixa de existir.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnreadCount(0);
      return;
    }

    let cancelled = false;
    countUnreadNotifications(token)
      .then((result) => {
        if (!cancelled) setUnreadCount(result.count);
      })
      .catch(() => {
        /* falha ao buscar contagem inicial não deve quebrar a UI */
      });

    return () => {
      cancelled = true;
    };
  }, [status, token]);

  const mergeById = useCallback((current: NotificationDto[], incoming: NotificationDto[]) => {
    const byId = new Map(current.map((item) => [item.id, item]));
    for (const item of incoming) {
      byId.set(item.id, item);
    }
    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, []);

  const loadFirstPage = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const result = await listNotifications(token, 1, PER_PAGE);
      setNotifications((current) => mergeById(current, result.items));
      setHasMore(result.page * result.perPage < result.total);
      setPage(result.page);
      setHasLoadedOnce(true);
    } finally {
      setLoading(false);
    }
  }, [token, mergeById]);

  const loadMore = useCallback(async () => {
    if (!token) return;

    const nextPage = page + 1;
    const result = await listNotifications(token, nextPage, PER_PAGE);
    setNotifications((current) => mergeById(current, result.items));
    setHasMore(result.page * result.perPage < result.total);
    setPage(result.page);
  }, [token, page, mergeById]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!token) return;

      const target = notifications.find((item) => item.id === id);
      const wasUnread = target ? target.readAt === null : true;

      setNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item)),
      );
      if (wasUnread) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }

      await markNotificationRead(token, id);
    },
    [token, notifications],
  );

  const markAllAsRead = useCallback(async () => {
    if (!token) return;

    const now = new Date().toISOString();
    setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? now })));
    setUnreadCount(0);

    await markAllNotificationsRead(token);
  }, [token]);

  const handleNotificationCreated = useCallback(
    (notification: NotificationDto) => {
      setNotifications((current) => mergeById(current, [notification]));
      setUnreadCount((count) => count + 1);
    },
    [mergeById],
  );

  useNotificationSocket(status === 'authenticated' ? token : null, handleNotificationCreated);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      loading,
      hasMore,
      hasLoadedOnce,
      loadFirstPage,
      loadMore,
      markAsRead,
      markAllAsRead,
    }),
    [notifications, unreadCount, loading, hasMore, hasLoadedOnce, loadFirstPage, loadMore, markAsRead, markAllAsRead],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotifications deve ser usado dentro de <NotificationProvider>.');
  }

  return context;
}
