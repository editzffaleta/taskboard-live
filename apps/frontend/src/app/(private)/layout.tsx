'use client';

import { useRouter } from 'next/navigation';
import { ShellProvider } from '@/shared/context/shell.context';
import { AdminShell } from '@/shared/template/admin-shell.component';
import { AppSidebarNavigation } from '@/shared/navigation/app-sidebar-navigation.component';
import {
  APP_NAVIGATION_SECTIONS,
  DEFAULT_NAVIGATION_MODULE_ID,
} from '@/shared/navigation/app-navigation.config';
import { AuthGuard } from '@/modules/auth/guard/auth.guard';
import { useAuth } from '@/modules/auth/context/auth.context';
import { CommandPalette } from '@/shared/components/ui/command-palette.component';
import { NotificationProvider } from '@/modules/notifications/context/notification.context';
import { NotificationBell } from '@/modules/notifications/components/notification-bell.component';

function PrivateShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    router.push('/join');
  }

  return (
    <ShellProvider defaultOpen>
      <AdminShell
        sidebar={
          <AppSidebarNavigation
            modules={APP_NAVIGATION_SECTIONS}
            defaultModuleId={DEFAULT_NAVIGATION_MODULE_ID}
          />
        }
        userName={user?.name}
        userEmail={user?.email}
        onLogout={handleLogout}
        notificationsSlot={<NotificationBell />}
      >
        {children}
      </AdminShell>
      {/* Command palette global (`023`), montado uma única vez para toda rota privada. */}
      <CommandPalette />
    </ShellProvider>
  );
}

export default function PrivateGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      {/* Provider global de notificações (`024`), montado uma única vez para toda rota
          privada, ao lado do `ShellProvider`/`CommandPalette` (`023`) — abre um socket de
          app-level próprio (`useNotificationSocket`), independente do `useBoardSocket`. */}
      <NotificationProvider>
        <PrivateShell>{children}</PrivateShell>
      </NotificationProvider>
    </AuthGuard>
  );
}
