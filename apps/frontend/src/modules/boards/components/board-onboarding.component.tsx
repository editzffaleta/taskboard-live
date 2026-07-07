'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Plus, RocketIcon, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { getMessage } from '@/shared/i18n';
import { useAuth } from '@/modules/auth/context/auth.context';
import { BoardsApiError, createBoard, type Board } from '@/modules/boards/api/boards.api';
import { addMember } from '@/modules/boards/api/members.api';

type BoardOnboardingProps = {
  onSkip: () => void;
  onBoardCreated: (board: Board) => void;
};

const STEP_TITLES: Record<number, string> = {
  1: 'Crie seu primeiro quadro',
  2: 'Convide seu time',
  3: 'Arraste um cartão',
};

const STEP_TEXTS: Record<number, string> = {
  1: 'Um quadro organiza seu trabalho em listas. Dê um nome e comece — você pode mudar tudo depois.',
  2: 'O TaskBoard Live brilha em conjunto. Convide colegas por e-mail para ver os cartões se moverem ao vivo.',
  3: 'Arraste cartões entre listas para atualizar o status. Todo mundo vê a mudança na hora, em tempo real.',
};

/**
 * Onboarding guiado de 3 passos (`mockups/Onboarding.dc.html`) exibido quando o usuário
 * autenticado não possui nenhum quadro. Passo 1 cria um quadro real (`createBoard`); passo 2
 * convida um membro real por e-mail (`addMember` aceita e-mail — decisão 4.1 da change:
 * funcional, não apenas instrutivo); passo 3 é só instrutivo (arrastar cartão é ensinado no
 * próprio quadro, já com drag-and-drop real).
 */
export function BoardOnboarding({ onSkip, onBoardCreated }: BoardOnboardingProps) {
  const { token } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [boardName, setBoardName] = useState('');
  const [createdBoard, setCreatedBoard] = useState<Board | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const progress = (step / 3) * 100;

  function reportError(error: unknown) {
    if (error instanceof BoardsApiError) {
      error.errors.forEach((code) => toast.error(getMessage(code)));
      return;
    }
    toast.error(getMessage('DEFAULT_API_ERROR'));
  }

  async function handleCreateBoard() {
    if (!token || !boardName.trim()) return;

    setIsSubmitting(true);
    try {
      const board = await createBoard(token, boardName.trim());
      setCreatedBoard(board);
      onBoardCreated(board);
      setStep(2);
    } catch (error) {
      reportError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleInvite() {
    if (!token || !createdBoard || !inviteEmail.trim()) return;

    setIsSubmitting(true);
    try {
      await addMember(token, createdBoard.id, inviteEmail.trim());
      toast.success('Convite enviado.');
      setInvitedEmails((prev) => [...prev, inviteEmail.trim()]);
      setInviteEmail('');
    } catch (error) {
      reportError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBack() {
    setStep((prev) => Math.max(1, prev - 1));
  }

  function handleNext() {
    if (step === 1) {
      void handleCreateBoard();
      return;
    }

    if (step < 3) {
      setStep((prev) => prev + 1);
      return;
    }

    if (createdBoard) {
      router.push(`/boards/${createdBoard.id}`);
    }
  }

  const nextDisabled = (step === 1 && (!boardName.trim() || isSubmitting)) || (step === 1 && isSubmitting);

  return (
    <div
      className="flex flex-1 items-center justify-center py-6"
      data-testid="board-onboarding"
    >
      <div className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="h-1.5 bg-muted">
          <div
            className="h-full rounded-r-sm bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex h-[220px] items-center justify-center overflow-hidden border-b border-border bg-muted/40">
          {step === 1 ? <StepOneIllustration /> : null}
          {step === 2 ? <StepTwoIllustration /> : null}
          {step === 3 ? <StepThreeIllustration /> : null}
        </div>

        <div className="px-7 pb-6 pt-6 text-center">
          <div className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-primary">
            Passo {step} de 3
          </div>
          <h1 className="mb-2.5 text-[23px] font-extrabold tracking-tight">{STEP_TITLES[step]}</h1>
          <p className="mx-auto mb-5 max-w-sm text-[14.5px] leading-relaxed text-muted-foreground">
            {STEP_TEXTS[step]}
          </p>

          {step === 1 ? (
            <div className="mx-auto max-w-[360px]">
              <Input
                value={boardName}
                onChange={(event) => setBoardName(event.target.value)}
                placeholder="Nome do quadro"
                className="text-center"
                data-testid="onboarding-board-name"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && boardName.trim()) {
                    event.preventDefault();
                    void handleCreateBoard();
                  }
                }}
              />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="mx-auto flex max-w-md flex-col gap-2">
              <div className="flex gap-2">
                <Input
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="colega@empresa.com"
                  type="email"
                  data-testid="onboarding-invite-email"
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!inviteEmail.trim() || isSubmitting}
                  onClick={() => void handleInvite()}
                  data-testid="onboarding-invite-submit"
                  className="gap-1.5 font-semibold"
                >
                  <UserPlus className="size-4" />
                  Adicionar
                </Button>
              </div>
              {invitedEmails.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Convidados: {invitedEmails.join(', ')}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-3 px-7 pb-6">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={handleBack} className="font-semibold">
              Voltar
            </Button>
          ) : (
            <button
              type="button"
              onClick={onSkip}
              className="text-sm font-semibold text-muted-foreground hover:text-foreground"
              data-testid="onboarding-skip"
            >
              Pular introdução
            </button>
          )}

          <div className="flex flex-1 justify-center gap-1.5">
            {[1, 2, 3].map((dot) => (
              <span
                key={dot}
                className="h-2 rounded-full bg-muted transition-all"
                style={{
                  width: dot === step ? 26 : 8,
                  backgroundColor: dot <= step ? 'var(--primary)' : undefined,
                }}
              />
            ))}
          </div>

          <Button
            type="button"
            onClick={handleNext}
            disabled={nextDisabled}
            className="gap-1.5 font-semibold"
            data-testid="onboarding-next"
          >
            {step < 3 ? 'Próximo' : 'Ir para meu quadro'}
            {step < 3 ? <ArrowRight className="size-4.5" /> : <RocketIcon className="size-4.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepOneIllustration() {
  return (
    <div className="flex items-start gap-3">
      <div className="w-24 rounded-xl border border-border bg-card p-2.5 shadow-sm">
        <div className="mb-2 h-2 w-3/5 rounded bg-muted-foreground/30" />
        <div className="mb-1.5 h-8 rounded-md bg-muted" />
        <div className="h-6 rounded-md bg-muted" />
      </div>
      <div className="w-24 rounded-xl border border-border bg-card p-2.5 shadow-sm">
        <div className="mb-2 h-2 w-4/5 rounded bg-muted-foreground/30" />
        <div className="h-7 rounded-md bg-muted" />
      </div>
      <div className="flex h-[90px] w-24 items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/10">
        <Plus className="size-7 text-primary" />
      </div>
    </div>
  );
}

function StepTwoIllustration() {
  return (
    <div className="flex items-center">
      <span className="flex size-14 items-center justify-center rounded-full border-4 border-muted bg-purple-600 text-lg font-semibold text-white">
        AC
      </span>
      <span className="-ml-4 flex size-14 items-center justify-center rounded-full border-4 border-muted bg-emerald-600 text-lg font-semibold text-white">
        RO
      </span>
      <span className="-ml-4 flex size-14 items-center justify-center rounded-full border-4 border-muted bg-rose-600 text-lg font-semibold text-white">
        MS
      </span>
      <span className="-ml-4 flex size-14 items-center justify-center rounded-full border-2 border-dashed border-primary bg-primary/10 text-primary">
        <UserPlus className="size-6" />
      </span>
    </div>
  );
}

function StepThreeIllustration() {
  return (
    <div className="relative flex items-start gap-3.5">
      <div className="w-[120px] rounded-xl border border-border bg-card p-2.5 shadow-sm">
        <div className="mb-2 h-2 w-1/2 rounded bg-muted-foreground/30" />
        <div className="h-11 rounded-lg border-2 border-dashed border-primary bg-primary/10" />
      </div>
      <div className="w-[120px] rounded-xl border border-border bg-card p-2.5 shadow-sm">
        <div className="mb-2 h-2 w-3/5 rounded bg-muted-foreground/30" />
        <div className="h-9 rounded-lg bg-muted" />
      </div>
      <div className="absolute left-11 top-[34px] w-[110px] rounded-lg border border-primary bg-card p-2.5 shadow-md">
        <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[9px] font-semibold text-teal-700 dark:bg-teal-500/20 dark:text-teal-300">
          Backend
        </span>
        <div className="mt-1.5 h-1.5 w-4/5 rounded bg-muted-foreground/30" />
      </div>
    </div>
  );
}
