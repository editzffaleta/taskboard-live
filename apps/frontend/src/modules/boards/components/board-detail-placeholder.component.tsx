'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Kanban } from 'lucide-react';
import { toast } from 'sonner';
import { getMessage } from '@/shared/i18n';
import { useAuth } from '@/modules/auth/context/auth.context';
import { BoardsApiError, getBoard, type Board } from '@/modules/boards/api/boards.api';

type BoardDetailPlaceholderProps = {
  boardId: string;
};

export function BoardDetailPlaceholder({ boardId }: BoardDetailPlaceholderProps) {
  const { token } = useAuth();
  const router = useRouter();
  const [board, setBoard] = useState<Board | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    getBoard(token, boardId)
      .then((result) => {
        if (cancelled) return;
        setBoard(result);
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

  if (status === 'loading' || status === 'error') {
    return (
      <div aria-busy="true" className="py-16 text-center text-sm text-muted-foreground">
        Carregando quadro...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-background/70 text-primary">
        <Kanban className="size-7" />
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight">{board?.name}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          O quadro ao vivo (colunas, cartões e colaboração em tempo real) chega em breve.
        </p>
      </div>
    </div>
  );
}
