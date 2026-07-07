'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarMenu, type ModuleNavigationEntry } from '@/shared/components/ui/sidebar-menu.component';
import { useAuth } from '@/modules/auth/context/auth.context';
import { listMyBoards, type Board } from '@/modules/boards/api/boards.api';
import { getBoardAccentColor } from '@/modules/boards/util/board-color.util';

type Props = {
  modules: ModuleNavigationEntry[];
  defaultModuleId?: string;
};

/**
 * Navegação principal do shell privado + seção "Seus quadros" com os quadros reais do
 * usuário logado (mesma `listMyBoards` usada pelo dashboard), no estilo do mockup: item com
 * indicador de cor determinístico (`getBoardAccentColor`), sem nomes fictícios.
 */
export function AppSidebarNavigation({ modules, defaultModuleId }: Props) {
  const pathname = usePathname();
  const { token } = useAuth();
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

  const active =
    modules.find((m) => pathname === m.item.href || pathname.startsWith(`${m.item.href}/`)) ??
    modules.find((m) => m.item.id === defaultModuleId) ??
    modules[0];

  return (
    <div className="flex min-h-full flex-col">
      <SidebarMenu
        mainItem={active?.mainItem}
        sections={active?.sections ?? []}
        moduleNavigation={
          active
            ? { activeModuleId: active.item.id, items: modules }
            : undefined
        }
      />

      {boards.length > 0 ? (
        <div className="space-y-1 px-4 pb-4" data-testid="sidebar-your-boards">
          <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Seus quadros
          </p>
          {boards.map((board) => {
            const accent = getBoardAccentColor(board.id);
            const isActive = pathname === `/boards/${board.id}`;
            return (
              <Link
                key={board.id}
                href={`/boards/${board.id}`}
                className={`flex h-9 items-center gap-2.5 rounded-lg px-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <span className={`size-2 shrink-0 rounded-sm ${accent.dot}`} aria-hidden />
                <span className="truncate">{board.name}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
