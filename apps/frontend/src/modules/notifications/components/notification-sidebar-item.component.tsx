'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { useNotifications } from '@/modules/notifications/context/notification.context';
import { NotificationDropdown } from '@/modules/notifications/components/notification-dropdown.component';

type NotificationSidebarItemProps = {
  collapsed: boolean;
};

const ITEM_BASE_CLASS =
  'group relative box-border flex h-11 w-full max-w-full items-center gap-3 rounded-xl px-3 text-[15px] text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground';
const COLLAPSED_CLASS = 'justify-center px-2';

/**
 * Item "Notificações" da sidebar única (`027`), no mesmo estilo visual dos demais itens de
 * `SidebarItemLink`, reaproveitando 100% a central real de notificações (`024`):
 * `useNotifications().unreadCount` para o badge (omitido quando zero, nunca fixo) e
 * `NotificationDropdown` para o conteúdo do popover — sem duplicar fetch/estado.
 */
export function NotificationSidebarItem({ collapsed }: NotificationSidebarItemProps) {
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);

  const button = (
    <button
      type="button"
      aria-label={collapsed ? 'Notificações' : undefined}
      data-testid="sidebar-notifications-trigger"
      className={`${ITEM_BASE_CLASS} ${collapsed ? COLLAPSED_CLASS : ''}`}
    >
      <Bell className="size-4 shrink-0" />
      <span className={`flex-1 truncate text-left ${collapsed ? 'sr-only' : ''}`}>Notificações</span>
      {unreadCount > 0 ? (
        <span
          className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground"
          data-testid="sidebar-notifications-unread-badge"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      ) : null}
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{button}</PopoverTrigger>
      <PopoverContent align="start" side={collapsed ? 'right' : 'bottom'} className="w-auto p-3">
        <NotificationDropdown onNavigate={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
