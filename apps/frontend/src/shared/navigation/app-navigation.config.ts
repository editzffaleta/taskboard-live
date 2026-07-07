import { Archive, LayoutGrid, Settings } from 'lucide-react';
import type { ModuleNavigationEntry } from '@/shared/components/ui/sidebar-menu.component';

// ── Rotas ─────────────────────────────────────────────────────────────────────

export const BOARDS_ROUTE = '/boards';
export const ARCHIVED_ROUTE = '/archived';
export const ACCOUNT_ROUTE = '/account';

// ── Estrutura de navegação ─────────────────────────────────────────────────────
// Config estática, declarativa e por seções ("Quadros", "Conta"). Os itens podem
// apontar para rotas que só existirão a partir da 004+ (módulos de domínio).
//
// PONTO DE EXTENSÃO (006 — papéis/RBAC): cada `SidebarMenuItem`/`ModuleNavigationEntry`
// poderá ganhar um campo opcional `roles`/`permissions` para gating por papel de
// `BoardMember` (owner|member). Nenhuma regra de papel é aplicada nesta mudança (002);
// a estrutura abaixo é o único ponto de futura extensão, sem necessidade de reescrita.

export const APP_NAVIGATION_SECTIONS: ModuleNavigationEntry[] = [
  {
    item: {
      id: 'boards',
      label: 'Quadros',
      shortLabel: 'Quadros',
      href: BOARDS_ROUTE,
      icon: LayoutGrid,
      // roles: ['owner', 'member'], // 006: gating por papel de BoardMember
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
            // roles: ['owner', 'member'], // 006: gating por papel de BoardMember
          },
          {
            id: 'archived',
            // Label estático (mesmo padrão hardcoded já usado pelos demais itens deste
            // arquivo, avaliado uma única vez no import do módulo — `getMessage` depende de
            // `document`/`navigator` e não é reativo aqui). `022`.
            label: 'Arquivados',
            href: ARCHIVED_ROUTE,
            icon: Archive,
            match: 'prefix',
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

export const DEFAULT_NAVIGATION_MODULE_ID = 'boards';
