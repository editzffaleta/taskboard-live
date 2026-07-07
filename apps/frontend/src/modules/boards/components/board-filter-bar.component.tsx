'use client';

import type { ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { CardAssigneeAvatar } from '@/modules/boards/components/card-assignee-avatar.component';
import { getMessage } from '@/shared/i18n';
import { countActiveFilters } from '@/modules/boards/util/board-filter.util';
import { EMPTY_BOARD_FILTER, type BoardFilterState, type DueFilter } from '@/modules/boards/types/board-filter.type';
import type { LabelState } from '@/modules/boards/types/board-state.type';
import type { BoardMember } from '@/modules/boards/api/members.api';

type BoardFilterBarProps = {
  filters: BoardFilterState;
  onChange: (filters: BoardFilterState) => void;
  boardLabels: LabelState[];
  members: BoardMember[];
};

const DUE_OPTIONS: DueFilter[] = ['late', 'today', 'next7days', 'none'];

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

/**
 * Barra de filtros: botão "+ Filtro" abrindo popover com quatro seções (Etiqueta, Responsável,
 * Prazo, Busca), chips removíveis por valor ativo, "Limpar filtros" quando há algo ativo (`019`).
 */
export function BoardFilterBar({ filters, onChange, boardLabels, members }: BoardFilterBarProps) {
  const activeCount = countActiveFilters(filters);

  function toggleLabel(labelId: string) {
    onChange({ ...filters, labelIds: toggleValue(filters.labelIds, labelId) });
  }

  function toggleAssignee(userId: string) {
    onChange({ ...filters, assigneeIds: toggleValue(filters.assigneeIds, userId) });
  }

  function toggleDue(due: DueFilter) {
    onChange({ ...filters, due: toggleValue(filters.due, due) });
  }

  function setSearch(search: string) {
    onChange({ ...filters, search });
  }

  function clearFilters() {
    onChange(EMPTY_BOARD_FILTER);
  }

  const labelChips = boardLabels.filter((label) => filters.labelIds.includes(label.id));
  const assigneeChips = members.filter((member) => filters.assigneeIds.includes(member.userId));

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="board-filter-bar">
      {labelChips.map((label) => (
        <FilterChip
          key={`label-${label.id}`}
          label={`${getMessage('boardFilters.label')}: ${label.name}`}
          onRemove={() => toggleLabel(label.id)}
        />
      ))}

      {assigneeChips.map((member) => (
        <FilterChip
          key={`assignee-${member.userId}`}
          label={member.name}
          onRemove={() => toggleAssignee(member.userId)}
        />
      ))}

      {filters.due.map((due) => (
        <FilterChip
          key={`due-${due}`}
          label={getMessage(`boardFilters.due.${due}`)}
          onRemove={() => toggleDue(due)}
        />
      ))}

      {filters.search.trim() !== '' ? (
        <FilterChip
          label={`${getMessage('boardFilters.search')}: ${filters.search}`}
          onRemove={() => setSearch('')}
        />
      ) : null}

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border px-3 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary"
            data-testid="board-filter-trigger"
          >
            <Plus className="size-3.5" />
            {getMessage('boardFilters.trigger')}
            {activeCount > 0 ? (
              <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {activeCount}
              </span>
            ) : null}
          </button>
        </PopoverTrigger>

        <PopoverContent className="flex w-72 flex-col gap-4" data-testid="board-filter-popover">
          <FilterSection title={getMessage('boardFilters.label')}>
            {boardLabels.length === 0 ? (
              <p className="text-xs text-muted-foreground">{getMessage('labelPopover.emptyState')}</p>
            ) : (
              boardLabels.map((label) => (
                <label key={label.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-muted">
                  <Checkbox
                    checked={filters.labelIds.includes(label.id)}
                    onCheckedChange={() => toggleLabel(label.id)}
                    data-testid={`board-filter-label-${label.id}`}
                  />
                  <span className="text-sm">{label.name}</span>
                </label>
              ))
            )}
          </FilterSection>

          <FilterSection title={getMessage('boardFilters.assignee')}>
            {members.length === 0 ? (
              <p className="text-xs text-muted-foreground">{getMessage('cardDetail.assignees.emptyState')}</p>
            ) : (
              members.map((member) => (
                <label
                  key={member.userId}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-muted"
                >
                  <Checkbox
                    checked={filters.assigneeIds.includes(member.userId)}
                    onCheckedChange={() => toggleAssignee(member.userId)}
                    data-testid={`board-filter-assignee-${member.userId}`}
                  />
                  <CardAssigneeAvatar id={member.userId} name={member.name} />
                  <span className="text-sm">{member.name}</span>
                </label>
              ))
            )}
          </FilterSection>

          <FilterSection title={getMessage('boardFilters.due.title')}>
            {DUE_OPTIONS.map((due) => (
              <label key={due} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-muted">
                <Checkbox
                  checked={filters.due.includes(due)}
                  onCheckedChange={() => toggleDue(due)}
                  data-testid={`board-filter-due-${due}`}
                />
                <span className="text-sm">{getMessage(`boardFilters.due.${due}`)}</span>
              </label>
            ))}
          </FilterSection>

          <FilterSection title={getMessage('boardFilters.search')}>
            <Input
              value={filters.search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={getMessage('boardFilters.searchPlaceholder')}
              className="h-8"
              data-testid="board-filter-search"
            />
          </FilterSection>
        </PopoverContent>
      </Popover>

      {activeCount > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          data-testid="board-filter-clear"
        >
          {getMessage('boardFilters.clear')}
        </Button>
      ) : null}
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary"
      data-testid="board-filter-chip"
    >
      {label}
      <button type="button" aria-label={getMessage('boardFilters.removeChip')} onClick={onRemove}>
        <X className="size-3.5" />
      </button>
    </span>
  );
}
