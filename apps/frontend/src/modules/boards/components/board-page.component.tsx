'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getMessage } from '@/shared/i18n';
import { useAuth } from '@/modules/auth/context/auth.context';
import { BoardsApiError, getBoard, listLabels } from '@/modules/boards/api/boards.api';
import { BoardView } from '@/modules/boards/components/board-view.component';
import { BoardColumnsSkeleton } from '@/modules/boards/components/board-columns-skeleton.component';
import type { BoardDetail, BoardDetailList, LabelDto } from '@/modules/boards/api/boards.api';
import type { BoardState, ListState } from '@/modules/boards/types/board-state.type';

type BoardPageProps = {
  boardId: string;
};

function toBoardState(detail: BoardDetail, labels: LabelDto[]): BoardState {
  return {
    id: detail.id,
    name: detail.name,
    ownerId: detail.ownerId,
    color: detail.color,
    lists: detail.lists.map(toListState),
    labels,
    commentsCountByCardId: {},
  };
}

function toListState(list: BoardDetailList): ListState {
  return {
    id: list.id,
    title: list.title,
    position: list.position,
    cards: list.cards.map((card) => ({
      id: card.id,
      listId: card.listId,
      title: card.title,
      description: card.description,
      position: card.position,
      labels: card.labels,
      dueDate: card.dueDate,
      assignees: card.assignees,
      checklist: card.checklist,
      cover: card.cover,
    })),
  };
}

/**
 * Carrega o quadro via REST (`GET /boards/:id`) e monta `BoardView` com o estado inicial.
 *
 * O backend (change de leitura de estado do quadro) retorna `{id, name, ownerId, createdAt,
 * lists: [{id, boardId, title, position, cards: [...]}]}` já ordenado por `position`. O
 * estado inicial é populado com esse conteúdo; atualizações subsequentes continuam vindo
 * ao vivo via Socket.IO (`list.*`/`card.*`).
 */
export function BoardPage({ boardId }: BoardPageProps) {
  const { token } = useAuth();
  const router = useRouter();
  const [board, setBoard] = useState<BoardState | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    Promise.all([getBoard(token, boardId), listLabels(token, boardId)])
      .then(([result, labels]) => {
        if (cancelled) return;
        setBoard(toBoardState(result, labels));
        setStatus('ready');
      })
      .catch((error) => {
        if (cancelled) return;

        if (error instanceof BoardsApiError) {
          error.errors.forEach((code) => toast.error(getMessage(code)));
        } else {
          toast.error(getMessage('DEFAULT_API_ERROR'));
        }

        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [token, boardId]);

  useEffect(() => {
    if (status === 'error') {
      router.replace('/boards');
    }
  }, [status, router]);

  if (status === 'loading' || status === 'error' || !board) {
    return <BoardColumnsSkeleton />;
  }

  return <BoardView initialBoard={board} />;
}
