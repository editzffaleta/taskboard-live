'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, MessageSquare, UserPlus, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { getCurrentLocale, getMessage } from '@/shared/i18n';
import { formatRelativeTime } from '@/modules/boards/util/activity-label.util';
import {
  formatNotificationLabel,
  resolveNotificationHref,
  resolveNotificationIcon,
} from '@/modules/notifications/util/notification-label.util';
import { NotificationsApiError } from '@/modules/notifications/api/notifications.api';
import { useNotifications } from '@/modules/notifications/context/notification.context';
import type { NotificationDto } from '@/modules/notifications/api/notifications.api';

function reportError(error: unknown) {
  if (error instanceof NotificationsApiError) {
    error.errors.forEach((code) => toast.error(getMessage(code)));
    return;
  }

  toast.error(getMessage('DEFAULT_API_ERROR'));
}

function NotificationIcon({ type }: { type: string }) {
  const kind = resolveNotificationIcon(type);

  if (kind === 'member') {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300">
        <UserPlus className="size-4.5" />
      </span>
    );
  }

  if (kind === 'assignment') {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-300">
        <UserRound className="size-4.5" />
      </span>
    );
  }

  if (kind === 'comment') {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-300">
        <MessageSquare className="size-4.5" />
      </span>
    );
  }

  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Bell className="size-4.5" />
    </span>
  );
}

type NotificationDropdownProps = {
  onNavigate: () => void;
};

/**
 * Lista paginada de notificações no dropdown do sino (`024`). Carrega a primeira página
 * na abertura (lazy), assina o contexto global para receber notificações ao vivo e
 * "marcar todas como lidas". Clique navega ao recurso e marca a notificação como lida.
 */
export function NotificationDropdown({ onNavigate }: NotificationDropdownProps) {
  const router = useRouter();
  const locale = getCurrentLocale();
  const {
    notifications,
    hasMore,
    loading,
    hasLoadedOnce,
    loadFirstPage,
    loadMore,
    markAsRead,
    markAllAsRead,
  } = useNotifications();
  const [markingAll, setMarkingAll] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (hasLoadedOnce || loading) return;
    loadFirstPage().catch(reportError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoadedOnce, loading]);

  async function handleMarkAllAsRead() {
    setMarkingAll(true);
    try {
      await markAllAsRead();
    } catch (error) {
      reportError(error);
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      await loadMore();
    } catch (error) {
      reportError(error);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleNotificationClick(notification: NotificationDto) {
    const href = resolveNotificationHref(notification);

    if (notification.readAt === null) {
      try {
        await markAsRead(notification.id);
      } catch (error) {
        reportError(error);
      }
    }

    onNavigate();
    if (href) router.push(href);
  }

  return (
    <div className="flex w-80 flex-col gap-2" data-testid="notification-dropdown">
      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-semibold">{getMessage('notificationDropdown.title')}</p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-xs"
          disabled={markingAll}
          onClick={handleMarkAllAsRead}
          data-testid="notification-mark-all-read"
        >
          <CheckCheck className="size-3.5" />
          {getMessage('notificationDropdown.markAllAsRead')}
        </Button>
      </div>

      <ul className="max-h-96 space-y-1.5 overflow-y-auto" aria-busy={loading}>
        {notifications.length === 0 && !loading ? (
          <li className="px-1 py-6 text-center text-sm text-muted-foreground">
            {getMessage('notificationDropdown.emptyState')}
          </li>
        ) : (
          notifications.map((notification) => {
            const isUnread = notification.readAt === null;
            return (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  data-testid="notification-item"
                  data-unread={isUnread}
                  className={`flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                    isUnread
                      ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
                      : 'border-transparent hover:bg-muted/60'
                  }`}
                >
                  <NotificationIcon type={notification.type} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-snug text-foreground">
                      {formatNotificationLabel(notification)}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatRelativeTime(notification.createdAt, locale)}
                    </p>
                  </div>
                  {isUnread ? (
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  ) : null}
                </button>
              </li>
            );
          })
        )}
      </ul>

      {hasMore ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="w-full"
          disabled={loadingMore}
          onClick={handleLoadMore}
        >
          {getMessage('notificationDropdown.loadMore')}
        </Button>
      ) : null}
    </div>
  );
}
