'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { BoardsApiError } from '@/modules/boards/api/boards.api';
import { listCardActivity } from '@/modules/boards/api/card-detail.api';
import type { Activity } from '@/modules/boards/api/activity.api';
import type { BoardMember } from '@/modules/boards/api/members.api';
import { formatActivityLabel, formatRelativeTime } from '@/modules/boards/util/activity-label.util';
import { getCurrentLocale, getMessage } from '@/shared/i18n';

type CardDetailActivityProps = {
  token: string;
  boardId: string;
  cardId: string;
  members: BoardMember[];
};

function reportError(error: unknown) {
  if (error instanceof BoardsApiError) {
    error.errors.forEach((code) => toast.error(getMessage(code)));
    return;
  }

  toast.error(getMessage('DEFAULT_API_ERROR'));
}

/**
 * Aba "Atividade" do cartão (`033`/`031`): carrega a página 1 ao ativar pela primeira vez,
 * reaproveita `formatActivityLabel`/`formatRelativeTime` (`011`) e pagina com "Carregar mais".
 * Sem tempo real dedicado — recarrega do zero a cada abertura do modal (mesmo padrão de
 * `CardDetailComments`).
 */
export function CardDetailActivity({ token, boardId, cardId, members }: CardDetailActivityProps) {
  const [items, setItems] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const locale = getCurrentLocale();

  useEffect(() => {
    let cancelled = false;

    listCardActivity(token, boardId, cardId, 1)
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
        setPage(1);
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
    };
  }, [token, boardId, cardId]);

  async function handleLoadMore() {
    const nextPage = page + 1;

    try {
      const result = await listCardActivity(token, boardId, cardId, nextPage);
      setItems((current) => {
        const byId = new Map(current.map((item) => [item.id, item]));
        result.items.forEach((item) => byId.set(item.id, item));
        return [...byId.values()];
      });
      setTotal(result.total);
      setPage(nextPage);
    } catch (error) {
      reportError(error);
    }
  }

  if (loading) return null;

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="card-detail-activity-empty">
        {getMessage('cardDetail.activity.empty')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="card-detail-activity-list">
      <ul className="flex flex-col gap-2">
        {items.map((activity) => (
          <li key={activity.id} className="text-sm" data-testid="card-detail-activity-item">
            <span>{formatActivityLabel(activity, members)}</span>{' '}
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(activity.createdAt, locale)}
            </span>
          </li>
        ))}
      </ul>

      {items.length < total ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={handleLoadMore}
          data-testid="card-detail-activity-load-more"
        >
          {getMessage('cardDetail.activity.loadMore')}
        </Button>
      ) : null}
    </div>
  );
}
