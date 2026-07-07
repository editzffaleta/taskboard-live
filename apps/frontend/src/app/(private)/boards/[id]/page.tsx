import { Suspense } from 'react';
import { BoardPage } from '@/modules/boards/components/board-page.component';
import { BoardColumnsSkeleton } from '@/modules/boards/components/board-columns-skeleton.component';

type BoardDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BoardDetailPage({ params }: BoardDetailPageProps) {
  const { id } = await params;

  // `BoardView` lê `useSearchParams()` (deep-link do cartão, `023`) — exige um limite
  // `Suspense` para permitir renderização estática do restante da rota.
  return (
    <Suspense fallback={<BoardColumnsSkeleton />}>
      <BoardPage boardId={id} />
    </Suspense>
  );
}
