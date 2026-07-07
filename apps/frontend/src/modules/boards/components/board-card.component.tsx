'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/shared/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Dialog, DialogTrigger } from '@/shared/components/ui/dialog';
import { StandardDialogContent } from '@/shared/components/ui/standard-dialog-content';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Button } from '@/shared/components/ui/button';
import { DeleteConfirmationDialog } from '@/shared/components/ui/delete-confirmation-dialog';
import { getMessage } from '@/shared/i18n';
import { useAuth } from '@/modules/auth/context/auth.context';
import { BoardsApiError, deleteBoard, renameBoard, type Board } from '@/modules/boards/api/boards.api';
import { resolveBoardColor } from '@/modules/boards/util/board-color.util';

type BoardCardProps = {
  board: Board;
  onRenamed: (board: Board) => void;
  onDeleted: (boardId: string) => void;
};

export function BoardCard({ board, onRenamed, onDeleted }: BoardCardProps) {
  const { token, user } = useAuth();
  const router = useRouter();
  const isOwner = user?.id === board.ownerId;
  const accent = resolveBoardColor(board);

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(board.name);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setIsSubmitting(true);
    try {
      const updated = await renameBoard(token, board.id, name);
      toast.success('Quadro renomeado com sucesso.');
      setRenameOpen(false);
      onRenamed(updated);
    } catch (error) {
      if (error instanceof BoardsApiError) {
        error.errors.forEach((code) => toast.error(getMessage(code)));
      } else {
        toast.error(getMessage('DEFAULT_API_ERROR'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!token) return;

    setIsSubmitting(true);
    try {
      await deleteBoard(token, board.id);
      toast.success('Quadro excluído com sucesso.');
      setDeleteOpen(false);
      onDeleted(board.id);
    } catch (error) {
      if (error instanceof BoardsApiError) {
        error.errors.forEach((code) => toast.error(getMessage(code)));
      } else {
        toast.error(getMessage('DEFAULT_API_ERROR'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card
      className="group relative flex flex-col gap-0 overflow-hidden p-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      data-testid="board-card"
      data-board-id={board.id}
      data-board-name={board.name}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => router.push(`/boards/${board.id}`)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') router.push(`/boards/${board.id}`);
        }}
        className="flex cursor-pointer flex-col"
        data-testid="board-card-open"
      >
        <div
          className={`flex h-20 items-end gap-1.5 bg-gradient-to-br ${accent.gradient} px-3.5 pt-3.5`}
          aria-hidden
        >
          <span className="h-13 w-8.5 rounded-t-md bg-white/90" />
          <span className="h-10 w-8.5 rounded-t-md bg-white/60" />
          <span className="h-15 w-8.5 rounded-t-md bg-white/40" />
        </div>
        <div className="flex flex-col gap-1 p-4">
          <h3 className="text-[14.5px] font-bold tracking-tight">{board.name}</h3>
        </div>
      </div>

      {isOwner ? (
        <div className="absolute right-3 top-24">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(event) => event.stopPropagation()}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                aria-label="Ações do quadro"
              >
                <MoreVertical className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent onClick={(event) => event.stopPropagation()}>
              <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
                <Pencil className="mr-2 size-4" />
                Renomear
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDeleteOpen(true)} className="text-destructive">
                <Trash2 className="mr-2 size-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogTrigger asChild>
          <span className="hidden" />
        </DialogTrigger>
        <StandardDialogContent
          title="Renomear quadro"
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => setRenameOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" form={`rename-board-form-${board.id}`} disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </>
          }
        >
          <form
            id={`rename-board-form-${board.id}`}
            className="flex flex-col gap-1.5"
            onSubmit={handleRename}
          >
            <Label htmlFor={`board-rename-${board.id}`}>Nome do quadro</Label>
            <Input
              id={`board-rename-${board.id}`}
              autoComplete="off"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </form>
        </StandardDialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Excluir quadro"
        description="Esta ação remove o quadro selecionado de forma permanente."
        itemLabel="Quadro"
        itemValue={board.name}
        isConfirming={isSubmitting}
      />
    </Card>
  );
}
