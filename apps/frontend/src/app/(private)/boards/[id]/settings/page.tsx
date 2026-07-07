import { BoardSettings } from '@/modules/boards/components/board-settings.component';

type BoardSettingsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BoardSettingsPage({ params }: BoardSettingsPageProps) {
  const { id } = await params;

  return <BoardSettings boardId={id} />;
}
