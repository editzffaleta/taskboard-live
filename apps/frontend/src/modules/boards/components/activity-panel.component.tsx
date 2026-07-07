'use client';

import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogTrigger } from '@/shared/components/ui/dialog';
import { StandardDialogContent } from '@/shared/components/ui/standard-dialog-content';
import { getCurrentLocale, getMessage } from '@/shared/i18n';
import { BoardsApiError } from '@/modules/boards/api/boards.api';
import { listActivity, type Activity } from '@/modules/boards/api/activity.api';
import type { BoardMember } from '@/modules/boards/api/members.api';
import { formatActivityLabel, formatRelativeTime } from '@/modules/boards/util/activity-label.util';

type ActivityPanelProps = {
  boardId: string;
  token: string | null;
  activities: Activity[];
  members: BoardMember[];
  onActivitiesLoaded: (page: { items: Activity[]; hasMore: boolean }) => void;
  onLoadMore: (page: { items: Activity[]; hasMore: boolean }) => void;
};

function reportError(error: unknown) {
  if (error instanceof BoardsApiError) {
    error.errors.forEach((code) => toast.error(getMessage(code)));
    return;
  }

  toast.error(getMessage('DEFAULT_API_ERROR'));
}

const PER_PAGE = 20;

/**
 * Painel "Atividade" acessível pela toolbar do quadro: carrega o histórico paginado via
 * REST (`GET /boards/:boardId/activity`) na primeira abertura e recebe novas entradas ao
 * vivo por `activity.created` (mescladas pelo `BoardView`, fonte de verdade do estado).
 */
export function ActivityPanel({
  boardId,
  token,
  activities,
  members,
  onActivitiesLoaded,
  onLoadMore,
}: ActivityPanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const locale = getCurrentLocale();

  useEffect(() => {
    if (!open || !token || hasLoadedOnce) return;

    let cancelled = false;

    const timer = setTimeout(() => {
      if (!cancelled) setLoading(true);
    }, 0);

    listActivity(token, boardId, 1, PER_PAGE)
      .then((result) => {
        if (cancelled) return;
        onActivitiesLoaded({
          items: result.items,
          hasMore: result.page * result.perPage < result.total,
        });
        setHasMore(result.page * result.perPage < result.total);
        setPage(result.page);
        setHasLoadedOnce(true);
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
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token, boardId, hasLoadedOnce]);

  async function handleLoadMore() {
    if (!token || loadingMore) return;

    const nextPage = page + 1;
    setLoadingMore(true);

    try {
      const result = await listActivity(token, boardId, nextPage, PER_PAGE);
      onLoadMore({
        items: result.items,
        hasMore: result.page * result.perPage < result.total,
      });
      setHasMore(result.page * result.perPage < result.total);
      setPage(result.page);
    } catch (error) {
      reportError(error);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Zap className="size-4" />
          {getMessage('activityPanel.trigger')}
        </Button>
      </DialogTrigger>

      <StandardDialogContent
        title={getMessage('activityPanel.title')}
        description={getMessage('activityPanel.description')}
      >
        <ul className="max-h-96 space-y-2 overflow-y-auto" aria-busy={loading}>
          {activities.length === 0 && !loading ? (
            <li className="py-2 text-sm text-muted-foreground">{getMessage('activityPanel.emptyState')}</li>
          ) : (
            activities.map((activity) => (
              <li
                key={activity.id}
                className="flex items-start gap-2.5 rounded-md border border-border/70 px-3 py-2 text-sm"
              >
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                <div className="min-w-0">
                  <p>{formatActivityLabel(activity, members)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatRelativeTime(activity.createdAt, locale)}
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>

        {hasMore ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="w-full"
            disabled={loadingMore}
            onClick={handleLoadMore}
          >
            {getMessage('activityPanel.loadMore')}
          </Button>
        ) : null}
      </StandardDialogContent>
    </Dialog>
  );
}
