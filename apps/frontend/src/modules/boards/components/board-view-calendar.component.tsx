'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { getMessage } from '@/shared/i18n';
import { labelColorClasses } from '@/modules/boards/util/label-color.util';
import type { FilteredCard } from '@/modules/boards/hooks/use-board-filters.hook';

type BoardViewCalendarProps = {
  filteredCards: FilteredCard[];
  onOpenCard: (cardId: string) => void;
  /** Injetável para testes; default `new Date()`. */
  now?: Date;
};

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const MAX_CARDS_PER_DAY = 3;

function toCivilDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameCivilDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

function buildMonthGrid(month: Date): Date[] {
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  const start = new Date(firstOfMonth);
  start.setDate(start.getDate() - firstOfMonth.getDay());

  const end = new Date(lastOfMonth);
  end.setDate(end.getDate() + (6 - lastOfMonth.getDay()));

  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

/**
 * Visão Calendário: grid mensal por `dueDate`, cartões sem prazo numa faixa lateral (`019`).
 * Estado de mês é local e não persistido (decisão do `design.md`).
 */
export function BoardViewCalendar({ filteredCards, onOpenCard, now = new Date() }: BoardViewCalendarProps) {
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));

  const days = buildMonthGrid(month);
  const today = toCivilDate(now);

  const cardsWithoutDueDate = filteredCards.filter((card) => card.dueDate === null);
  const cardsByDay = new Map<number, FilteredCard[]>();

  filteredCards
    .filter((card) => card.dueDate !== null)
    .forEach((card) => {
      const cardDate = toCivilDate(new Date(card.dueDate as string));
      const dayIndex = days.findIndex((day) => isSameCivilDay(day, cardDate));
      if (dayIndex === -1) return;
      const list = cardsByDay.get(dayIndex) ?? [];
      list.push(card);
      cardsByDay.set(dayIndex, list);
    });

  const monthLabel = new Intl.DateTimeFormat(getMessage('boardViews.calendar.locale'), {
    month: 'long',
    year: 'numeric',
  }).format(month);

  function goToPreviousMonth() {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  function goToNextMonth() {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  function goToToday() {
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  return (
    <div className="flex min-h-0 flex-1 gap-4 overflow-auto bg-muted/30 p-4 md:p-6" data-testid="board-view-calendar">
      <div className="flex min-w-[760px] flex-1 flex-col gap-3.5">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold capitalize">{monthLabel}</span>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-[30px]"
              aria-label={getMessage('boardViews.calendar.previousMonth')}
              onClick={goToPreviousMonth}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-[30px]"
              aria-label={getMessage('boardViews.calendar.nextMonth')}
              onClick={goToNextMonth}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={goToToday}>
            {getMessage('boardViews.calendar.today')}
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
          <div className="grid grid-cols-7 border-b border-border bg-muted/50">
            {WEEKDAY_KEYS.map((key) => (
              <div
                key={key}
                className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
              >
                {getMessage(`boardViews.calendar.weekday.${key}`)}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-[96px]">
            {days.map((day, index) => {
              const inCurrentMonth = day.getMonth() === month.getMonth();
              const isToday = isSameCivilDay(day, today);
              const dayCards = cardsByDay.get(index) ?? [];
              const visibleCards = dayCards.slice(0, MAX_CARDS_PER_DAY);
              const hiddenCount = dayCards.length - visibleCards.length;

              return (
                <div
                  key={day.toISOString()}
                  className={`overflow-hidden border-b border-r border-border p-1.5 last:border-r-0 ${
                    isToday ? 'bg-primary/5' : ''
                  }`}
                  data-testid="board-view-calendar-day"
                >
                  <span
                    className={`inline-flex size-[22px] items-center justify-center rounded-full text-xs font-semibold ${
                      isToday
                        ? 'bg-primary text-primary-foreground'
                        : inCurrentMonth
                          ? ''
                          : 'text-muted-foreground opacity-50'
                    }`}
                  >
                    {day.getDate()}
                  </span>

                  <div className="mt-1 flex flex-col gap-1">
                    {visibleCards.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => onOpenCard(card.id)}
                        className={`truncate rounded-md px-1.5 py-1 text-left text-[10.5px] font-semibold ${
                          card.labels[0] ? labelColorClasses(card.labels[0].color) : 'bg-muted text-foreground'
                        }`}
                        data-testid="board-view-calendar-card"
                        data-card-id={card.id}
                      >
                        {card.title}
                      </button>
                    ))}
                    {hiddenCount > 0 ? (
                      <span className="px-1.5 text-[10.5px] font-semibold text-muted-foreground">
                        +{hiddenCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex w-56 shrink-0 flex-col gap-2 rounded-xl border border-border bg-background p-3 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {getMessage('boardViews.calendar.noDueDate')}
        </p>
        <div className="flex flex-col gap-1.5 overflow-y-auto">
          {cardsWithoutDueDate.length === 0 ? (
            <p className="text-xs text-muted-foreground">{getMessage('boardViews.emptyState')}</p>
          ) : (
            cardsWithoutDueDate.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => onOpenCard(card.id)}
                className="rounded-md border border-border/70 px-2 py-1.5 text-left text-[12.5px] hover:bg-muted/40"
                data-testid="board-view-calendar-no-due-card"
                data-card-id={card.id}
              >
                {card.title}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
