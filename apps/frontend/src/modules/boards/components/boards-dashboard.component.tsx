'use client';

import { useEffect, useState } from 'react';
import { Kanban } from 'lucide-react';
import { toast } from 'sonner';
import { getMessage } from '@/shared/i18n';
import { useAuth } from '@/modules/auth/context/auth.context';
import { BoardsApiError, listMyBoards, type Board } from '@/modules/boards/api/boards.api';
import { CreateBoardDialog } from '@/modules/boards/components/create-board-dialog.component';
import { BoardCard } from '@/modules/boards/components/board-card.component';

export function BoardsDashboard() {
  const { token } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    listMyBoards(token)
      .then((result) => {
        if (cancelled) return;
        setBoards(result);
        setStatus('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof BoardsApiError) {
          error.errors.forEach((code) => toast.error(getMessage(code)));
        } else {
          toast.error(getMessage('DEFAULT_API_ERROR'));
        }
        setStatus('ready');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  function handleCreated(board: Board) {
    setBoards((prev) => [board, ...prev]);
  }

  function handleRenamed(updated: Board) {
    setBoards((prev) => prev.map((board) => (board.id === updated.id ? updated : board)));
  }

  function handleDeleted(boardId: string) {
    setBoards((prev) => prev.filter((board) => board.id !== boardId));
  }

  return (
    <div className="flex flex-col gap-6" data-testid="boards-dashboard">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Meus quadros</h1>
          <p className="text-sm text-muted-foreground">
            Crie um quadro e convide colegas para colaborar em tempo real.
          </p>
        </div>
        <CreateBoardDialog onCreated={handleCreated} />
      </div>

      {status === 'loading' ? (
        <div aria-busy="true" className="py-16 text-center text-sm text-muted-foreground">
          Carregando quadros...
        </div>
      ) : boards.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/70 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-background/70 text-primary">
            <Kanban className="size-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Você ainda não tem nenhum quadro</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Crie o seu primeiro quadro para começar a organizar tarefas com o seu time.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="boards-list">
          {boards.map((board) => (
            <BoardCard key={board.id} board={board} onRenamed={handleRenamed} onDeleted={handleDeleted} />
          ))}
        </div>
      )}
    </div>
  );
}
