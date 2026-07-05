import { BoardPage } from '@/modules/boards/components/board-page.component';

type BoardDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BoardDetailPage({ params }: BoardDetailPageProps) {
  const { id } = await params;

  return <BoardPage boardId={id} />;
}
