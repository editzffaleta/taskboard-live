export type DueDateStatus = 'late' | 'today' | 'upcoming';

function toCivilDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Classifica um `dueDate` (string ISO ou `null`) em `'late' | 'today' | 'upcoming' | null`,
 * comparando por data civil (ano/mês/dia) — não por timestamp exato — para não marcar
 * "atrasado" um cartão cujo prazo é hoje às 23:59. Função pura: recebe `now` como parâmetro
 * opcional (default `new Date()`), sem `Date.now()` implícito, testável sem mock de relógio.
 */
export function classifyDueDate(dueDate: string | null, now: Date = new Date()): DueDateStatus | null {
  if (!dueDate) return null;

  const due = toCivilDate(new Date(dueDate));
  const today = toCivilDate(now);

  if (due.getTime() < today.getTime()) return 'late';
  if (due.getTime() === today.getTime()) return 'today';
  return 'upcoming';
}
