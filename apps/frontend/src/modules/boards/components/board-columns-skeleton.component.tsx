import { Skeleton } from '@/shared/components/ui/skeleton';

/** Esqueleto de colunas exibido enquanto `GET /boards/:id` carrega o estado inicial. */
export function BoardColumnsSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4" aria-busy="true" data-testid="board-columns-skeleton">
      {Array.from({ length: 3 }).map((_, columnIndex) => (
        <div
          key={columnIndex}
          className="w-[280px] shrink-0 rounded-2xl border border-border/70 bg-muted/30 p-3"
        >
          <Skeleton className="mb-3 h-4 w-1/2" />
          {Array.from({ length: columnIndex === 1 ? 2 : 3 }).map((_, cardIndex) => (
            <Skeleton key={cardIndex} className="mb-2.5 h-16 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}
