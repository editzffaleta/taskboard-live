'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronRight, Lock } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { DeleteConfirmationDialog } from '@/shared/components/ui/delete-confirmation-dialog';
import { getMessage } from '@/shared/i18n';
import { useAuth } from '@/modules/auth/context/auth.context';
import {
  archiveBoard,
  BoardsApiError,
  deleteBoard,
  getBoard,
  updateBoard,
  type BoardDetail,
} from '@/modules/boards/api/boards.api';
import { listMembers, type BoardMember } from '@/modules/boards/api/members.api';
import { MembersPanel } from '@/modules/boards/components/members-panel.component';
import { BoardLabelsManager } from '@/modules/boards/components/board-labels-manager.component';
import { BoardColumnsSkeleton } from '@/modules/boards/components/board-columns-skeleton.component';
import { BOARD_COLORS, type BoardColor } from '@/modules/boards/types/board-state.type';
import { BOARD_COLOR_HEX } from '@/modules/boards/util/board-color.util';

type BoardSettingsProps = {
  boardId: string;
};

function reportError(error: unknown) {
  if (error instanceof BoardsApiError) {
    error.errors.forEach((code) => toast.error(getMessage(code)));
    return;
  }
  toast.error(getMessage('DEFAULT_API_ERROR'));
}

/**
 * Tela "Configurações do quadro" (`020`), restrita ao owner: reúne renomear + cor/realce
 * (`Geral`), etiquetas (CRUD completo, `BoardLabelsManager`), membros (reaproveita
 * `MembersPanel` da `010`, sem duplicar lógica) e a zona de perigo (excluir quadro,
 * reaproveitando `DELETE /boards/:id` da `005`). "Visibilidade" é renderizada apenas como
 * informativa/estática (só "Privado" marcado) — o produto não tem link público nem
 * workspace/tenant (fora de escopo, `design.md`). "Arquivar" é renderizado desabilitado com
 * nota "em breve" (escopo da `022`).
 *
 * Acesso: se o usuário logado não for o owner do quadro, é redirecionado de volta para o
 * quadro ao vivo — a UI não oferece nenhum controle de mutação a quem não é owner (o backend
 * já bloqueia via `403`, mas a tela nem chega a exibi-los).
 */
export function BoardSettings({ boardId }: BoardSettingsProps) {
  const { token, user } = useAuth();
  const router = useRouter();
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'denied' | 'error'>('loading');
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savingColor, setSavingColor] = useState<BoardColor | null>(null);
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (!token || !user) return;
    let cancelled = false;

    getBoard(token, boardId)
      .then((result) => {
        if (cancelled) return;
        if (result.ownerId !== user.id) {
          setStatus('denied');
          return;
        }
        setBoard(result);
        setName(result.name);
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
  }, [token, user, boardId]);

  useEffect(() => {
    if (status === 'denied' || status === 'error') {
      router.replace(`/boards/${boardId}`);
    }
  }, [status, router, boardId]);

  useEffect(() => {
    if (!token || status !== 'ready') return;
    let cancelled = false;

    listMembers(token, boardId)
      .then((result) => {
        if (cancelled) return;
        setMembers(result);
      })
      .catch(() => {
        // Silencioso: o painel de membros já reporta erros ao tentar carregar de novo.
      });

    return () => {
      cancelled = true;
    };
  }, [token, boardId, status]);

  async function handleSaveName(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !token || !board) return;

    setSavingName(true);
    try {
      const updated = await updateBoard(token, boardId, { name: trimmed });
      setBoard((current) => (current ? { ...current, name: updated.name } : current));
      toast.success(getMessage('boardSettings.general.nameSaved'));
    } catch (error) {
      reportError(error);
    } finally {
      setSavingName(false);
    }
  }

  async function handleSelectColor(color: BoardColor) {
    if (!token || !board || savingColor) return;

    const previousColor = board.color;
    setSavingColor(color);
    setBoard((current) => (current ? { ...current, color } : current));

    try {
      await updateBoard(token, boardId, { color });
    } catch (error) {
      setBoard((current) => (current ? { ...current, color: previousColor } : current));
      reportError(error);
    } finally {
      setSavingColor(null);
    }
  }

  async function handleArchiveBoard() {
    if (!token) return;

    setArchiving(true);
    try {
      await archiveBoard(token, boardId);
      toast.success(getMessage('boardSettings.dangerZone.archiveSuccess'));
      router.replace('/boards');
    } catch (error) {
      reportError(error);
    } finally {
      setArchiving(false);
    }
  }

  async function handleDeleteBoard() {
    if (!token) return;

    setDeleting(true);
    try {
      await deleteBoard(token, boardId);
      toast.success(getMessage('boardSettings.dangerZone.deleteSuccess'));
      router.replace('/boards');
    } catch (error) {
      reportError(error);
    } finally {
      setDeleting(false);
    }
  }

  if (status === 'loading' || status === 'denied' || status === 'error' || !board) {
    return <BoardColumnsSkeleton />;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-12" data-testid="board-settings">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/boards/${boardId}`} className="font-semibold hover:text-foreground">
          {board.name}
        </Link>
        <ChevronRight className="size-4" />
        <span className="font-bold text-foreground">{getMessage('boardSettings.title')}</span>
      </div>

      <h1 className="text-2xl font-extrabold tracking-tight">{getMessage('boardSettings.title')}</h1>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm" data-testid="board-settings-general">
        <h2 className="mb-4 text-base font-bold">{getMessage('boardSettings.general.title')}</h2>

        <form onSubmit={handleSaveName} className="mb-5 flex flex-col gap-1.5">
          <Label htmlFor="board-settings-name">{getMessage('boardSettings.general.nameLabel')}</Label>
          <div className="flex items-center gap-2">
            <Input
              id="board-settings-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="flex-1"
              data-testid="board-settings-name-input"
            />
            <Button type="submit" size="sm" disabled={savingName || !name.trim()} data-testid="board-settings-name-save">
              {savingName ? getMessage('boardSettings.general.saving') : getMessage('boardSettings.general.save')}
            </Button>
          </div>
        </form>

        <Label className="mb-2 block">{getMessage('boardSettings.general.colorLabel')}</Label>
        <div className="flex flex-wrap gap-2">
          {BOARD_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={getMessage(`boardColor.${color}`)}
              aria-pressed={board.color === color}
              onClick={() => handleSelectColor(color)}
              disabled={savingColor !== null}
              style={{ backgroundColor: BOARD_COLOR_HEX[color] }}
              className={`h-9 w-11 rounded-lg transition-transform ${
                board.color === color ? 'scale-105 ring-2 ring-offset-2 ring-primary' : ''
              }`}
              data-testid={`board-settings-color-${color}`}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm" data-testid="board-settings-visibility">
        <h2 className="mb-1 text-base font-bold">{getMessage('boardSettings.visibility.title')}</h2>
        <p className="mb-3 text-sm text-muted-foreground">{getMessage('boardSettings.visibility.description')}</p>
        <div className="flex items-center gap-3 rounded-xl border border-primary bg-primary/5 p-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-background text-primary">
            <Lock className="size-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">{getMessage('boardSettings.visibility.private')}</p>
            <p className="text-xs text-muted-foreground">{getMessage('boardSettings.visibility.privateDescription')}</p>
          </div>
          <span className="size-4 shrink-0 rounded-full border-4 border-primary bg-background" />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm" data-testid="board-settings-labels">
        <h2 className="mb-4 text-base font-bold">{getMessage('boardSettings.labels.title')}</h2>
        <BoardLabelsManager boardId={boardId} token={token} />
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm" data-testid="board-settings-members">
        <h2 className="mb-4 text-base font-bold">{getMessage('boardSettings.members.title')}</h2>
        <MembersPanel
          boardId={boardId}
          token={token}
          currentUserId={user?.id ?? null}
          isOwner
          members={members}
          onMembersLoaded={setMembers}
          onMemberRemoved={(userId) => setMembers((current) => current.filter((member) => member.userId !== userId))}
        />
      </section>

      <section
        className="rounded-2xl border border-destructive bg-card p-5"
        data-testid="board-settings-danger-zone"
      >
        <h2 className="mb-4 text-base font-bold text-destructive">{getMessage('boardSettings.dangerZone.title')}</h2>

        <div className="flex items-center gap-4 border-b border-border pb-4">
          <div className="flex-1">
            <p className="text-sm font-semibold">{getMessage('boardSettings.dangerZone.archiveTitle')}</p>
            <p className="text-xs text-muted-foreground">{getMessage('boardSettings.dangerZone.archiveDescription')}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setArchiveOpen(true)}
            data-testid="board-settings-archive-button"
          >
            {getMessage('boardSettings.dangerZone.archiveButton')}
          </Button>
        </div>

        <div className="flex items-center gap-4 pt-4">
          <div className="flex-1">
            <p className="text-sm font-semibold">{getMessage('boardSettings.dangerZone.deleteTitle')}</p>
            <p className="text-xs text-muted-foreground">{getMessage('boardSettings.dangerZone.deleteDescription')}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => setDeleteOpen(true)}
            data-testid="board-settings-delete-trigger"
          >
            {getMessage('boardSettings.dangerZone.deleteButton')}
          </Button>
        </div>
      </section>

      <DeleteConfirmationDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        onConfirm={handleArchiveBoard}
        title={getMessage('boardSettings.dangerZone.archiveTitle')}
        description={getMessage('boardSettings.dangerZone.archiveDescription')}
        itemLabel={getMessage('boardSettings.dangerZone.deleteItemLabel')}
        itemValue={board.name}
        confirmWord={getMessage('boardSettings.dangerZone.archiveConfirmWord')}
        confirmLabel={getMessage('boardSettings.dangerZone.archiveButton')}
        isConfirming={archiving}
      />

      <DeleteConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteBoard}
        title={getMessage('boardSettings.dangerZone.deleteTitle')}
        description={getMessage('boardSettings.dangerZone.deleteDescription')}
        itemLabel={getMessage('boardSettings.dangerZone.deleteItemLabel')}
        itemValue={board.name}
        isConfirming={deleting}
      />
    </div>
  );
}
