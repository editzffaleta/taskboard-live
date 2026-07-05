'use client';

import { useRouter } from 'next/navigation';
import { ShellProvider } from '@/shared/context/shell.context';
import { AdminShell } from '@/shared/template/admin-shell.component';
import { AppSidebarNavigation } from '@/shared/navigation/app-sidebar-navigation.component';
import {
  APP_NAVIGATION_SECTIONS,
  DEFAULT_NAVIGATION_MODULE_ID,
} from '@/shared/navigation/app-navigation.config';

export default function PrivateGroupLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <ShellProvider defaultOpen>
      {/* TODO: adicionar guard de autenticação (spec-frontend-auth, change 003/004) */}
      <AdminShell
        sidebar={
          <AppSidebarNavigation
            modules={APP_NAVIGATION_SECTIONS}
            defaultModuleId={DEFAULT_NAVIGATION_MODULE_ID}
          />
        }
        onLogout={() => router.push('/')}
      >
        {children}
      </AdminShell>
    </ShellProvider>
  );
}
