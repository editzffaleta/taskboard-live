'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogTrigger } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { StandardDialogContent } from '@/shared/components/ui/standard-dialog-content';
import { getMessage } from '@/shared/i18n';
import { useAuth } from '@/modules/auth/context/auth.context';
import { BoardsApiError, createBoard, type Board } from '@/modules/boards/api/boards.api';

type CreateBoardDialogProps = {
  onCreated: (board: Board) => void;
};

export function CreateBoardDialog({ onCreated }: CreateBoardDialogProps) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

    setIsSubmitting(true);

    try {
      const board = await createBoard(token, name);
      toast.success('Quadro criado com sucesso.');
      setName('');
      setOpen(false);
      onCreated(board);
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="create-board-trigger">Criar quadro</Button>
      </DialogTrigger>

      <StandardDialogContent
        title="Criar quadro"
        description="Dê um nome para o seu novo quadro."
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="create-board-form"
              disabled={isSubmitting}
              data-testid="create-board-submit"
            >
              {isSubmitting ? 'Criando...' : 'Criar'}
            </Button>
          </>
        }
      >
        <form id="create-board-form" className="flex flex-col gap-1.5" onSubmit={handleSubmit}>
          <Label htmlFor="board-name">Nome do quadro</Label>
          <Input
            id="board-name"
            name="name"
            autoComplete="off"
            required
            data-testid="create-board-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </form>
      </StandardDialogContent>
    </Dialog>
  );
}
