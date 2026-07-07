'use client';

import { CalendarDays, LayoutGrid, Rows3 } from 'lucide-react';
import { getMessage } from '@/shared/i18n';
import type { BoardViewMode } from '@/modules/boards/types/board-filter.type';

type BoardViewSwitcherProps = {
  activeView: BoardViewMode;
  onChange: (view: BoardViewMode) => void;
};

const OPTIONS: { view: BoardViewMode; icon: typeof LayoutGrid; labelKey: string }[] = [
  { view: 'kanban', icon: LayoutGrid, labelKey: 'boardViews.mode.kanban' },
  { view: 'lista', icon: Rows3, labelKey: 'boardViews.mode.lista' },
  { view: 'calendario', icon: CalendarDays, labelKey: 'boardViews.mode.calendario' },
];

/** Segmented control de três botões (Kanban/Lista/Calendário), reproduzindo o mockup (`019`). */
export function BoardViewSwitcher({ activeView, onChange }: BoardViewSwitcherProps) {
  return (
    <div
      className="inline-flex shrink-0 gap-0.5 rounded-[9px] border border-border bg-muted/50 p-[3px]"
      data-testid="board-view-switcher"
    >
      {OPTIONS.map(({ view, icon: Icon, labelKey }) => {
        const active = activeView === view;
        return (
          <button
            key={view}
            type="button"
            onClick={() => onChange(view)}
            aria-pressed={active}
            className={`inline-flex h-[30px] items-center gap-1.5 rounded-md px-3 text-[12.5px] font-semibold transition-colors ${
              active ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
            data-testid={`board-view-switcher-${view}`}
          >
            <Icon className="size-4" />
            {getMessage(labelKey)}
          </button>
        );
      })}
    </div>
  );
}
