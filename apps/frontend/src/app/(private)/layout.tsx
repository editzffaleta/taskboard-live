'use client';

import { useRouter } from 'next/navigation';
import { LayoutGrid, Settings } from 'lucide-react';
import { ShellProvider } from '@/shared/context/shell.context';
import { AdminShell } from '@/shared/template/admin-shell.component';
import { AppSidebarNavigation } from '@/shared/navigation/app-sidebar-navigation.component';
import type { ModuleNavigationEntry } from '@/shared/components/ui/sidebar-menu.component';

// ── Rotas ─────────────────────────────────────────────────────────────────────

const BOARDS_ROUTE = '/boards';
const ACCOUNT_ROUTE = '/account';

// ── Estrutura de navegação ─────────────────────────────────────────────────────
// Base da fundacao (001): apenas o shell/sidebar enxuta com "Quadros" e "Conta".
// Modulos de dominio (quadros, listas, cartoes) sao criados a partir da 004+.

const APP_MODULES: ModuleNavigationEntry[] = [
  {
    item: {
      id: 'boards',
      label: 'Quadros',
      shortLabel: 'Quadros',
      href: BOARDS_ROUTE,
      icon: LayoutGrid,
    },
    sections: [
      {
        id: 'boards-main',
        label: 'Quadros',
        items: [
          {
            id: 'boards-list',
            label: 'Meus quadros',
            href: BOARDS_ROUTE,
            icon: LayoutGrid,
            match: 'exact',
          },
        ],
      },
    ],
  },
  {
    item: {
      id: 'account',
      label: 'Conta',
      shortLabel: 'Conta',
      href: ACCOUNT_ROUTE,
      icon: Settings,
    },
    sections: [
      {
        id: 'account-main',
        label: 'Conta',
        items: [
          {
            id: 'account-settings',
            label: 'Preferências',
            href: ACCOUNT_ROUTE,
            icon: Settings,
            match: 'exact',
          },
        ],
      },
    ],
  },
];

// ──────────────────────────────────────────────────────────────────────────────

export default function PrivateGroupLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <ShellProvider defaultOpen>
      {/* TODO: adicionar guard de autenticação (spec-frontend-auth, change 003/004) */}
      <AdminShell
        sidebar={<AppSidebarNavigation modules={APP_MODULES} defaultModuleId="boards" />}
        onLogout={() => router.push('/')}
      >
        {children}
      </AdminShell>
    </ShellProvider>
  );
}
