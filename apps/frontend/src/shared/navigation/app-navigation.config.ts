import { Archive, LayoutGrid, LayoutTemplate } from 'lucide-react';
import type { SidebarMenuItem } from '@/shared/components/ui/sidebar-menu.component';

// ── Rotas ─────────────────────────────────────────────────────────────────────

export const BOARDS_ROUTE = '/boards';
export const ARCHIVED_ROUTE = '/archived';
export const TEMPLATES_ROUTE = '/templates';
export const ACCOUNT_ROUTE = '/account';

// ── Estrutura de navegação ─────────────────────────────────────────────────────
// Config estática, declarativa e plana (sidebar única, `027`) — fiel a
// `mockups/Meus Quadros.dc.html`: logo → busca → itens de navegação → "Seus quadros" →
// "Criar quadro". `ACCOUNT_ROUTE` continua exportada, mas não faz mais parte da lista de
// itens de primeiro nível: "Conta" vive só no menu do usuário da topbar (`admin-shell
// .component.tsx`).
//
// PONTO DE EXTENSÃO (006 — papéis/RBAC): cada `SidebarMenuItem` poderá ganhar um campo
// opcional `roles`/`permissions` para gating por papel de `BoardMember` (owner|member).
// Nenhuma regra de papel é aplicada nesta mudança; a estrutura abaixo é o único ponto de
// futura extensão, sem necessidade de reescrita.

// Itens de rota de primeiro nível, na ordem do mockup, exceto "Notificações": esse item
// não é uma rota (não existe página dedicada) — é renderizado diretamente em
// `app-sidebar-navigation.component.tsx`, reaproveitando `NotificationBell`/`useNotifications`
// (`024`), na posição indicada por `NOTIFICATIONS_ITEM_INDEX` abaixo.
export const APP_NAVIGATION_ITEMS: SidebarMenuItem[] = [
  {
    id: 'boards-list',
    label: 'Meus quadros',
    href: BOARDS_ROUTE,
    icon: LayoutGrid,
    match: 'exact',
    // roles: ['owner', 'member'], // 006: gating por papel de BoardMember
  },
  {
    id: 'templates',
    // Label estático (mesmo padrão hardcoded já usado pelos demais itens deste
    // arquivo). `025`.
    label: 'Modelos',
    href: TEMPLATES_ROUTE,
    icon: LayoutTemplate,
    match: 'prefix',
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
];

/** Posição (0-based) em que o item "Notificações" (não-roteável) é inserido visualmente
 * entre os itens de `APP_NAVIGATION_ITEMS`, para reproduzir a ordem do mockup: Meus
 * quadros → Modelos → Notificações → Arquivados. */
export const NOTIFICATIONS_ITEM_INDEX = 2;
