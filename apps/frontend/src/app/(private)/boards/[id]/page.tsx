import { BoardDetailPlaceholder } from '@/modules/boards/components/board-detail-placeholder.component';

type BoardDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BoardDetailPage({ params }: BoardDetailPageProps) {
  const { id } = await params;

  return <BoardDetailPlaceholder boardId={id} />;
}
