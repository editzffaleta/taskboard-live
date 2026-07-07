'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutTemplate } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { getMessage } from '@/shared/i18n';
import { useAuth } from '@/modules/auth/context/auth.context';
import {
  BoardsApiError,
  createBoardFromTemplate,
  listBoardTemplates,
  type BoardTemplate,
} from '@/modules/templates/api/templates.api';
import { TemplateCard } from '@/modules/templates/components/template-card.component';

const ALL_CATEGORY = 'all';

function reportError(error: unknown) {
  if (error instanceof BoardsApiError) {
    error.errors.forEach((code) => toast.error(getMessage(code)));
    return;
  }
  toast.error(getMessage('DEFAULT_API_ERROR'));
}

function TemplatesGallerySkeleton() {
  return (
    <div
      className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-[18px]"
      aria-busy="true"
      data-testid="templates-gallery-skeleton"
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-3 overflow-hidden rounded-2xl border border-border/70">
          <Skeleton className="h-[120px] w-full rounded-none" />
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-2 h-9 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Galeria "Comece com um modelo" (`025`), reproduzindo `Modelos.dc.html`: busca
 * `GET /board-templates` uma única vez ao montar, filtro por categoria client-side (sem nova
 * requisição) e botão "Usar modelo" que cria o quadro (`POST /boards/from-template`) e navega
 * para `/boards/[id]` já populado.
 */
export function TemplatesGallery() {
  const { token } = useAuth();
  const router = useRouter();

  const [templates, setTemplates] = useState<BoardTemplate[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [category, setCategory] = useState<string>(ALL_CATEGORY);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    listBoardTemplates(token)
      .then((result) => {
        if (cancelled) return;
        setTemplates(result);
        setStatus('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        reportError(error);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(templates.map((template) => template.category)));
    return [ALL_CATEGORY, ...unique];
  }, [templates]);

  const filteredTemplates = useMemo(
    () =>
      category === ALL_CATEGORY
        ? templates
        : templates.filter((template) => template.category === category),
    [templates, category],
  );

  async function handleUse(template: BoardTemplate) {
    if (!token || submittingId) return;

    setSubmittingId(template.id);
    try {
      const board = await createBoardFromTemplate(token, template.id);
      toast.success(getMessage('templates.useSuccess'));
      router.push(`/boards/${board.id}`);
    } catch (error) {
      reportError(error);
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-12" data-testid="templates-gallery">
      <div>
        <h1 className="mb-1 text-[26px] font-extrabold tracking-tight">{getMessage('templates.title')}</h1>
        <p className="text-sm text-muted-foreground">{getMessage('templates.subtitle')}</p>
      </div>

      {status === 'ready' && templates.length > 0 ? (
        <div className="flex flex-wrap gap-2" data-testid="templates-category-filter">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              data-testid={`templates-category-${item}`}
              className={`h-8 rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${
                category === item
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              {item === ALL_CATEGORY ? getMessage('templates.category.all') : item}
            </button>
          ))}
        </div>
      ) : null}

      {status === 'loading' ? (
        <TemplatesGallerySkeleton />
      ) : status === 'error' ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/70 py-16 text-center">
          <p className="text-sm text-muted-foreground">{getMessage('templates.error')}</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/70 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-background/70 text-primary">
            <LayoutTemplate className="size-7" />
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">{getMessage('templates.empty')}</p>
        </div>
      ) : (
        <div
          className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-[18px]"
          data-testid="templates-list"
        >
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isSubmitting={submittingId === template.id}
              onUse={handleUse}
            />
          ))}
        </div>
      )}
    </div>
  );
}
