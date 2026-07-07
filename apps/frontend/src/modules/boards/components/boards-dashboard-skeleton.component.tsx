import { Skeleton } from '@/shared/components/ui/skeleton';

/** Grade de cards-esqueleto exibida enquanto `GET /boards` está em andamento. */
export function BoardsDashboardSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      data-testid="boards-dashboard-skeleton"
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-2xl border border-border/70 p-5">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-2 h-9 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}
