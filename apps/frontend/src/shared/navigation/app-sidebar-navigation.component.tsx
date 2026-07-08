'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import {
  SidebarItemLink,
  isSidebarItemActive,
  type SidebarMenuItem,
} from '@/shared/components/ui/sidebar-menu.component';
import { AppLogo } from '@/shared/components/branding/app-logo.component';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { useShell } from '@/shared/hooks/shell.hook';
import { useAuth } from '@/modules/auth/context/auth.context';
import { listMyBoards, type Board } from '@/modules/boards/api/boards.api';
import { resolveBoardColor } from '@/modules/boards/util/board-color.util';
import { CreateBoardDialog } from '@/modules/boards/components/create-board-dialog.component';
import { NotificationSidebarItem } from '@/modules/notifications/components/notification-sidebar-item.component';
import { APP_NAVIGATION_ITEMS, NOTIFICATIONS_ITEM_INDEX, BOARDS_ROUTE } from '@/shared/navigation/app-navigation.config';

/**
 * Sidebar única do shell privado (`027`), fiel a `mockups/Meus Quadros.dc.html`: logo →
 * busca (abre o `CommandPalette` da `023` via evento customizado) → itens de navegação
 * (`APP_NAVIGATION_ITEMS`, com "Notificações" reaproveitando a central real da `024`) →
 * seção "Seus quadros" (dado real via `listMyBoards`, cor via `resolveBoardColor`) → botão
 * "Criar quadro". Substitui o antigo switcher de módulo de dois níveis (`015`).
 */
export function AppSidebarNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { token } = useAuth();
  const { isMobile, isSidebarOpen } = useShell();
  const isCollapsed = !isMobile && !isSidebarOpen;
  const [boards, setBoards] = useState<Board[]>([]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    listMyBoards(token)
      .then((result) => {
        if (!cancelled) setBoards(result);
      })
      .catch(() => {
        // Falha silenciosa: a lista de quadros na sidebar é decoração de navegação; o
        // dashboard (`boards-dashboard.component.tsx`) já reporta o erro ao usuário.
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  function handleOpenSearch() {
    window.dispatchEvent(new CustomEvent('taskboard:command-palette:open'));
  }

  function handleBoardCreated(board: Board) {
    setBoards((current) => [board, ...current]);
    router.push(`/boards/${board.id}`);
  }

  return (
    <div className="flex min-h-full flex-col px-2 py-4">
      <Link
        href={BOARDS_ROUTE}
        aria-label="Ir para meus quadros"
        className="mb-3 flex items-center gap-2 px-2 pb-3"
      >
        <AppLogo size="md" showText={!isCollapsed} priority />
      </Link>

      {isCollapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleOpenSearch}
              aria-label="Buscar"
              data-testid="sidebar-search-trigger"
              className="mb-3 flex h-10 w-full items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
            >
              <Search className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            Buscar…
          </TooltipContent>
        </Tooltip>
      ) : (
        <button
          type="button"
          onClick={handleOpenSearch}
          data-testid="sidebar-search-trigger"
          className="mb-3 flex h-10 w-full items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 text-left">Buscar…</span>
          <span className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            ⌘K
          </span>
        </button>
      )}

      <div className="space-y-1">
        {APP_NAVIGATION_ITEMS.map((item, index) => (
          <div key={item.id} className="space-y-1">
            <SidebarItemLink item={item} active={isSidebarItemActive(pathname, item)} collapsed={isCollapsed} />
            {index === NOTIFICATIONS_ITEM_INDEX - 1 ? (
              <NotificationSidebarItem collapsed={isCollapsed} />
            ) : null}
          </div>
        ))}
      </div>

      <div className="my-4 h-px bg-border" />

      {boards.length > 0 ? (
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto" data-testid="sidebar-your-boards">
          {!isCollapsed ? (
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Seus quadros
            </p>
          ) : null}
          {boards.map((board) => {
            const accent = resolveBoardColor(board);
            const isActive = pathname === `/boards/${board.id}`;
            const link = (
              <Link
                key={board.id}
                href={`/boards/${board.id}`}
                aria-label={isCollapsed ? board.name : undefined}
                className={`flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors ${
                  isCollapsed ? 'justify-center px-2' : ''
                } ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <span className={`size-2 shrink-0 rounded-sm ${accent.dot}`} aria-hidden />
                {isCollapsed ? null : <span className="truncate">{board.name}</span>}
              </Link>
            );

            if (!isCollapsed) return link;

            return (
              <Tooltip key={board.id}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {board.name}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <div className="pt-3">
        <CreateBoardDialog
          onCreated={handleBoardCreated}
          triggerTestId="sidebar-create-board-trigger"
          triggerClassName="w-full"
        />
      </div>
    </div>
  );
}

// Reexportado para eventual uso em testes/documentação sem acoplar ao tipo interno.
export type { SidebarMenuItem };
