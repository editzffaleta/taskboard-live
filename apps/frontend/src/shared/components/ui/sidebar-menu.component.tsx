'use client';
import { Circle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { usePathname } from 'next/navigation';
import { useShell } from '@/shared/hooks/shell.hook';
import type { ComponentType } from 'react';
import Link from 'next/link';
type SidebarIcon = ComponentType<{ className?: string }>;

export type SidebarMenuItem = {
  id: string;
  label: string;
  shortLabel?: string;
  href: string;
  icon?: SidebarIcon;
  match?: 'exact' | 'prefix';
  excludeHrefs?: string[];
};

export type SidebarMenuSection = {
  id: string;
  label?: string;
  items: SidebarMenuItem[];
};

export type SidebarMenuProps = {
  mainItem?: SidebarMenuItem;
  sections: SidebarMenuSection[];
  collapsed?: boolean;
};

const ITEM_BASE_CLASS =
  'group relative box-border flex h-11 w-full max-w-full items-center gap-3 rounded-xl px-3 text-[15px] text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground';
const COLLAPSED_CLASS = 'justify-center px-2';
const ACTIVE_CLASS =
  'border border-border bg-accent text-accent-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]';

function joinClassNames(values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function isSidebarItemActive(pathname: string, item: SidebarMenuItem) {
  if (item.excludeHrefs?.some((excludedHref) => pathname === excludedHref || pathname.startsWith(`${excludedHref}/`))) {
    return false;
  }

  if (item.match === 'exact') {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function SidebarItemLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: SidebarMenuItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon ?? Circle;
  const link = (
    <Link
      href={item.href}
      aria-label={collapsed ? item.label : undefined}
      onClick={onNavigate}
      className={joinClassNames([ITEM_BASE_CLASS, collapsed && COLLAPSED_CLASS, active && ACTIVE_CLASS])}
    >
      <Icon className="size-4 shrink-0" />
      <span className={joinClassNames(['truncate', collapsed && 'sr-only'])}>{item.label}</span>
    </Link>
  );

  if (!collapsed) {
    return link;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

function MenuSections({
  sections,
  pathname,
  isCollapsed,
  onNavigate,
}: {
  sections: SidebarMenuSection[];
  pathname: string;
  isCollapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.id}>
          {section.label && !isCollapsed ? (
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {section.label}
            </p>
          ) : null}

          <div className="space-y-1">
            {section.items.map((item) => (
              <SidebarItemLink
                key={item.id}
                item={item}
                active={isSidebarItemActive(pathname, item)}
                collapsed={isCollapsed}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Navegação da sidebar única (`027`) — lista simples de itens (com seções opcionais),
 * suportando o modo colapsado (ícone só) já existente hoje no shell
 * (`isSidebarOpen`/`collapsed`). O antigo padrão de dois níveis ("módulo" com rail/flyout)
 * foi removido: nenhum outro consumidor no projeto usava
 * `moduleNavigation`/`ModuleNavigationEntry` (confirmado por
 * `grep -rn "moduleNavigation\|ModuleNavigationEntry" apps/frontend/src`).
 */
export function SidebarMenu({ mainItem, sections, collapsed }: SidebarMenuProps) {
  const pathname = usePathname();
  const { isMobile, isSidebarOpen } = useShell();
  const isCollapsed = collapsed ?? (!isMobile && !isSidebarOpen);

  return (
    <nav className="px-2 py-4">
      {mainItem ? (
        <>
          <div className="space-y-1">
            <SidebarItemLink item={mainItem} active={isSidebarItemActive(pathname, mainItem)} collapsed={isCollapsed} />
          </div>
          <div className="my-4 h-px bg-border" />
        </>
      ) : null}

      <MenuSections sections={sections} pathname={pathname} isCollapsed={isCollapsed} />
    </nav>
  );
}
