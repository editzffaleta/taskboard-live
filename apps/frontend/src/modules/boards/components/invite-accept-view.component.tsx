'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Ban, Users } from 'lucide-react';
import { AppLogo } from '@/shared/components/branding/app-logo.component';
import { Button } from '@/shared/components/ui/button';
import { ThemeToggle } from '@/shared/components/theme/theme-toggle.component';
import { SystemState } from '@/shared/components/ui/system-state.component';
import { getMessage } from '@/shared/i18n';
import { useAuth } from '@/modules/auth/context/auth.context';
import {
  acceptInvitation,
  getInvitationPreview,
  type InvitationPreview,
} from '@/modules/boards/api/invitations.api';
import { BoardsApiError } from '@/modules/boards/api/boards.api';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'invalid-status' }
  | { kind: 'ready'; preview: InvitationPreview };

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

/** `/join?convite=:token` — preserva o token para completar o aceite após autenticar. */
export function buildJoinRedirectPath(token: string): string {
  return `/join?convite=${encodeURIComponent(token)}`;
}

type InviteAcceptViewProps = {
  token: string;
};

/**
 * Página pública de aceite de convite (`026`) — reproduz `mockups/Aceitar Convite.dc.html`:
 * busca a prévia pública do convite e, conforme o `status` de autenticação, ou aceita
 * diretamente (logado) ou encaminha para `/join` preservando o token (deslogado).
 */
export function InviteAcceptView({ token }: InviteAcceptViewProps) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [accepting, setAccepting] = useState(false);
  const [mismatchEmail, setMismatchEmail] = useState<string | null>(null);
  const { status, user, token: authToken, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    getInvitationPreview(token)
      .then((preview) => {
        if (cancelled) return;
        if (preview.status !== 'pending') {
          setState({ kind: 'invalid-status' });
          return;
        }
        setState({ kind: 'ready', preview });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ kind: 'not-found' });
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleEnterBoard = useCallback(async () => {
    if (status !== 'authenticated' || !authToken) return;

    setAccepting(true);
    setMismatchEmail(null);

    try {
      const result = await acceptInvitation(authToken, token);
      router.push(`/boards/${result.boardId}`);
    } catch (error) {
      if (error instanceof BoardsApiError && error.errors.includes('invitation.email.mismatch')) {
        setMismatchEmail(state.kind === 'ready' ? state.preview.email : null);
        return;
      }
      if (error instanceof BoardsApiError && error.errors.includes('invitation.invalid.status')) {
        setState({ kind: 'invalid-status' });
        return;
      }
      setState({ kind: 'not-found' });
    } finally {
      setAccepting(false);
    }
  }, [status, authToken, token, router, state]);

  const handleGoToJoin = useCallback(() => {
    router.push(buildJoinRedirectPath(token));
  }, [router, token]);

  if (state.kind === 'loading') {
    return (
      <div
        aria-busy="true"
        className="flex min-h-screen items-center justify-center bg-background"
        data-testid="invite-accept-loading"
      >
        <p className="text-sm text-muted-foreground">{getMessage('inviteAccept.loading')}</p>
      </div>
    );
  }

  if (state.kind === 'not-found') {
    return (
      <div className="min-h-screen bg-background" data-testid="invite-accept-not-found">
        <SystemState
          icon={Ban}
          title={getMessage('inviteAccept.notFoundTitle')}
          description={getMessage('inviteAccept.notFoundDescription')}
          action={{ label: 'Ir para o início', href: '/' }}
        />
      </div>
    );
  }

  if (state.kind === 'invalid-status') {
    return (
      <div className="min-h-screen bg-background" data-testid="invite-accept-invalid-status">
        <SystemState
          icon={Users}
          title={getMessage('inviteAccept.invalidStatusTitle')}
          description={getMessage('inviteAccept.invalidStatusDescription')}
          action={{ label: 'Ir para o início', href: '/' }}
        />
      </div>
    );
  }

  const { preview } = state;

  return (
    <div className="flex min-h-screen flex-col bg-background" data-testid="invite-accept-page">
      <div className="flex h-16 items-center justify-between px-7">
        <AppLogo size="md" />
        <ThemeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-[480px]">
          <div className="mb-5 text-center">
            <h1 className="mb-1.5 text-[22px] font-extrabold tracking-tight">
              {getMessage('inviteAccept.invitedBy', { params: { invitedByName: preview.invitedByName } })}
            </h1>
            <p className="m-0 text-sm text-muted-foreground">{getMessage('inviteAccept.subtitle')}</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
            <div className="flex h-[80px] items-center justify-center bg-gradient-to-br from-rose-600 to-pink-800 px-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-900">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {preview.boardName}
              </span>
            </div>

            <div className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {initials(preview.invitedByName)}
                </span>
                <div>
                  <p className="text-sm font-semibold">{preview.boardName}</p>
                  <p className="text-xs text-muted-foreground">{preview.email}</p>
                </div>
              </div>

              {mismatchEmail ? (
                <p
                  className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-[12.5px] text-destructive"
                  data-testid="invite-accept-mismatch"
                >
                  {getMessage('inviteAccept.mismatchMessage', { params: { email: mismatchEmail } })}
                </p>
              ) : null}

              {status === 'authenticated' ? (
                <>
                  <Button
                    size="lg"
                    className="w-full gap-2 font-semibold"
                    disabled={accepting}
                    onClick={handleEnterBoard}
                    data-testid="invite-accept-enter"
                  >
                    <LogIn className="size-5" />
                    {accepting ? getMessage('inviteAccept.entering') : getMessage('inviteAccept.enterBoard')}
                  </Button>
                  <p className="mt-3 text-center text-[12.5px] text-muted-foreground">
                    {getMessage('inviteAccept.signingInAs', { params: { email: user?.email ?? '' } })}{' '}
                    <button
                      type="button"
                      onClick={logout}
                      className="font-semibold text-foreground hover:text-primary"
                      data-testid="invite-accept-switch-account"
                    >
                      {getMessage('inviteAccept.switchAccount')}
                    </button>
                  </p>
                </>
              ) : (
                <Button
                  size="lg"
                  className="w-full gap-2 font-semibold"
                  onClick={handleGoToJoin}
                  data-testid="invite-accept-join"
                >
                  <LogIn className="size-5" />
                  {getMessage('inviteAccept.enterBoard')}
                </Button>
              )}
            </div>
          </div>

          <p className="mt-4.5 text-center text-xs leading-relaxed text-muted-foreground">
            {getMessage('inviteAccept.termsNotice')}
          </p>
        </div>
      </div>
    </div>
  );
}
