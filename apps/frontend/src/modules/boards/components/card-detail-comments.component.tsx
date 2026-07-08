'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { CardAssigneeAvatar } from '@/modules/boards/components/card-assignee-avatar.component';
import { BoardsApiError } from '@/modules/boards/api/boards.api';
import {
  addComment,
  deleteComment,
  listComments,
  type CommentDto,
} from '@/modules/boards/api/card-detail.api';
import { getMessage } from '@/shared/i18n';

const PAGE_SIZE = 20;

type CommentEvent =
  | { type: 'created'; comment: CommentDto }
  | { type: 'deleted'; commentId: string; cardId: string }
  | null;

type CardDetailCommentsProps = {
  token: string;
  boardId: string;
  cardId: string;
  currentUserId: string | null;
  currentUserName: string;
  commentEvent: CommentEvent;
  onCommentsCountHydrated: (cardId: string, total: number) => void;
};

function reportError(error: unknown) {
  if (error instanceof BoardsApiError) {
    error.errors.forEach((code) => toast.error(getMessage(code)));
    return;
  }

  toast.error(getMessage('DEFAULT_API_ERROR'));
}

/**
 * Aba de comentários do modal de detalhe: lista paginada (mais recente primeiro, "Carregar
 * mais"), form de novo comentário (otimista) e exclusão autor-only. Hidrata
 * `commentsCountByCardId` do cartão com o `total` retornado ao carregar a primeira página.
 */
export function CardDetailComments({
  token,
  boardId,
  cardId,
  currentUserId,
  currentUserName,
  commentEvent,
  onCommentsCountHydrated,
}: CardDetailCommentsProps) {
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [newText, setNewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadingTimer = setTimeout(() => {
      if (!cancelled) setLoading(true);
    }, 0);

    listComments(token, boardId, cardId, 1, PAGE_SIZE)
      .then((result) => {
        if (cancelled) return;
        setComments(result.comments ?? []);
        setTotal(result.total);
        setPage(1);
        onCommentsCountHydrated(cardId, result.total);
      })
      .catch((error) => {
        if (cancelled) return;
        reportError(error);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(loadingTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, cardId, token]);

  useEffect(() => {
    if (!commentEvent || commentEvent.type !== 'created' || commentEvent.comment.cardId !== cardId) return;

    const timer = setTimeout(() => {
      setComments((current) => {
        if (current.some((comment) => comment.id === commentEvent.comment.id)) return current;
        return [commentEvent.comment, ...current];
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [commentEvent, cardId]);

  useEffect(() => {
    if (!commentEvent || commentEvent.type !== 'deleted' || commentEvent.cardId !== cardId) return;

    const timer = setTimeout(() => {
      setComments((current) => current.filter((comment) => comment.id !== commentEvent.commentId));
    }, 0);

    return () => clearTimeout(timer);
  }, [commentEvent, cardId]);

  async function handleLoadMore() {
    const nextPage = page + 1;
    setLoading(true);

    try {
      const result = await listComments(token, boardId, cardId, nextPage, PAGE_SIZE);
      setComments((current) => {
        const existingIds = new Set(current.map((comment) => comment.id));
        return [
          ...current,
          ...(result.comments ?? []).filter((comment) => !existingIds.has(comment.id)),
        ];
      });
      setTotal(result.total);
      setPage(nextPage);
    } catch (error) {
      reportError(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = newText.trim();
    if (!trimmed || !currentUserId) return;

    const tempId = `temp-comment-${crypto.randomUUID()}`;
    const optimisticComment: CommentDto = {
      id: tempId,
      cardId,
      authorId: currentUserId,
      authorName: currentUserName,
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    setSubmitting(true);
    setComments((current) => [optimisticComment, ...current]);
    setNewText('');

    try {
      const created = await addComment(token, boardId, cardId, trimmed);
      setComments((current) => {
        // Se o eco do socket já substituiu/adicionou o comentário real, apenas remove o
        // otimista em vez de duplicar (mesmo padrão de `handleCreateCard`).
        const jaReconciliadoPeloSocket = current.some((comment) => comment.id === created.id);
        if (jaReconciliadoPeloSocket) {
          return current.filter((comment) => comment.id !== tempId);
        }
        return current.map((comment) => (comment.id === tempId ? created : comment));
      });
      setTotal((current) => current + 1);
    } catch (error) {
      setComments((current) => current.filter((comment) => comment.id !== tempId));
      reportError(error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    const previous = comments;
    setComments((current) => current.filter((comment) => comment.id !== commentId));

    try {
      await deleteComment(token, boardId, cardId, commentId);
    } catch (error) {
      setComments(previous);
      reportError(error);
    }
  }

  const hasMore = comments.length < total;

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={newText}
          onChange={(event) => setNewText(event.target.value)}
          placeholder={getMessage('cardDetail.comments.placeholder')}
          disabled={submitting}
          data-testid="card-detail-comment-input"
        />
        <Button type="submit" disabled={submitting || !newText.trim()} data-testid="card-detail-comment-submit">
          {getMessage('cardDetail.comments.submitButton')}
        </Button>
      </form>

      {comments.length === 0 && !loading ? (
        <p className="text-sm text-muted-foreground">{getMessage('cardDetail.comments.emptyState')}</p>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="card-detail-comments-list">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-2.5" data-testid="card-detail-comment">
              <CardAssigneeAvatar id={comment.authorId} name={comment.authorName} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">{comment.authorName}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
                <div className="rounded-[4px_12px_12px_12px] border border-border bg-muted/50 px-3 py-2 text-sm leading-relaxed text-secondary-foreground">
                  {comment.text}
                </div>
                {comment.authorId === currentUserId ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(comment.id)}
                    className="mt-1 text-xs font-medium text-muted-foreground hover:text-destructive"
                    data-testid="card-detail-comment-delete"
                  >
                    {getMessage('cardDetail.comments.deleteButton')}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasMore ? (
        <Button type="button" variant="outline" size="sm" onClick={handleLoadMore} disabled={loading}>
          {getMessage('cardDetail.comments.loadMore')}
        </Button>
      ) : null}
    </div>
  );
}
