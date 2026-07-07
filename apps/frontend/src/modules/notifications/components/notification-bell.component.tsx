'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { getMessage } from '@/shared/i18n';
import { useNotifications } from '@/modules/notifications/context/notification.context';
import { NotificationDropdown } from '@/modules/notifications/components/notification-dropdown.component';

/**
 * Sino de notificações (`024`) injetado na topbar via slot `notificationsSlot` do
 * `AdminShell`. Exibe badge com a contagem de não lidas (mantida em contexto pelo
 * `NotificationProvider`) e abre o dropdown/central ao clicar.
 */
export function NotificationBell() {
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={getMessage('notificationBell.label')}
          data-testid="notification-bell-trigger"
        >
          <Bell className="size-5" />
          {unreadCount > 0 ? (
            <span
              className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground"
              data-testid="notification-unread-badge"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-auto p-3">
        <NotificationDropdown onNavigate={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
