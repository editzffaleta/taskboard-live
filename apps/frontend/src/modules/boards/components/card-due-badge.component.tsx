import { AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { classifyDueDate } from '@/modules/boards/util/due-date.util';
import { getMessage } from '@/shared/i18n';

type CardDueBadgeProps = {
  dueDate: string | null;
  /** Injetável para testes; default `new Date()`. */
  now?: Date;
};

/**
 * Selo compacto de prazo (atrasado/hoje/futuro), reaproveitado no modal de detalhe e no
 * `kanban-card`. Não renderiza nada se `dueDate` for `null`.
 */
export function CardDueBadge({ dueDate, now }: CardDueBadgeProps) {
  const status = classifyDueDate(dueDate, now);
  if (!status || !dueDate) return null;

  const formattedDate = format(new Date(dueDate), 'dd MMM', { locale: ptBR });

  if (status === 'late') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 font-semibold text-destructive"
        data-testid="card-due-badge"
        data-due-status="late"
      >
        <AlertCircle className="size-3.5" />
        {getMessage('cardDetail.due.late', { params: { date: formattedDate } })}
      </span>
    );
  }

  if (status === 'today') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
        data-testid="card-due-badge"
        data-due-status="today"
      >
        <Clock className="size-3.5" />
        {getMessage('cardDetail.due.today')}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-muted-foreground"
      data-testid="card-due-badge"
      data-due-status="upcoming"
    >
      <Clock className="size-3.5" />
      {getMessage('cardDetail.due.upcoming', { params: { date: formattedDate } })}
    </span>
  );
}
