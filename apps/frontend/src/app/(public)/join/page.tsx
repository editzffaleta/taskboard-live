'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { AppLogo } from '@/shared/components/branding/app-logo.component';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { ThemeToggle } from '@/shared/components/theme/theme-toggle.component';
import { getMessage } from '@/shared/i18n';
import type { ApiErrorResponse } from '@/shared/types/api-error.type';
import { useAuth } from '@/modules/auth/context/auth.context';
import { acceptInvitation } from '@/modules/boards/api/invitations.api';
import { BoardsApiError } from '@/modules/boards/api/boards.api';

const PRIVATE_HOME_ROUTE = '/boards';

/**
 * Completa o aceite de um convite (`026`, `?convite=:token`) após login/registro bem
 * -sucedidos. Em `invitation.email.mismatch`, mostra o erro e mantém na página (não
 * redireciona silenciosamente para o quadro de outra pessoa).
 */
async function completeInviteIfPresent(
  authToken: string,
  inviteToken: string | null,
  router: ReturnType<typeof useRouter>,
): Promise<boolean> {
  if (!inviteToken) {
    router.push(PRIVATE_HOME_ROUTE);
    return true;
  }

  try {
    const result = await acceptInvitation(authToken, inviteToken);
    router.push(`/boards/${result.boardId}`);
    return true;
  } catch (error) {
    if (error instanceof BoardsApiError) {
      error.errors.forEach((code) => toast.error(getMessage(code)));
      return false;
    }
    toast.error(getMessage('DEFAULT_API_ERROR'));
    return false;
  }
}

type JoinMode = 'register' | 'login';

type RegisterFormState = {
  name: string;
  email: string;
  password: string;
};

const INITIAL_REGISTER_FORM: RegisterFormState = {
  name: '',
  email: '',
  password: '',
};

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as Record<string, unknown>).errors)
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  dataTestId,
  required,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  dataTestId: string;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        name="password"
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        required={required}
        data-testid={dataTestId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        className="absolute right-1.5 top-1.5 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
      </button>
    </div>
  );
}

function RegisterForm() {
  const [form, setForm] = useState<RegisterFormState>(INITIAL_REGISTER_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (response.status === 201) {
        toast.success('Cadastro realizado com sucesso.');
        setForm(INITIAL_REGISTER_FORM);
        return;
      }

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (isApiErrorResponse(body) && body.errors.length > 0) {
        body.errors.forEach((code) => {
          toast.error(getMessage(code));
        });
        return;
      }

      toast.error(getMessage('INTERNAL_SERVER_ERROR'));
    } catch {
      toast.error(getMessage('DEFAULT_API_ERROR'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex w-full flex-col gap-4" onSubmit={handleSubmit} data-testid="register-form">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-name">Nome</Label>
        <Input
          id="register-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          data-testid="register-name"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-email">E-mail</Label>
        <Input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          data-testid="register-email"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-password">Senha</Label>
        <PasswordInput
          id="register-password"
          autoComplete="new-password"
          required
          dataTestId="register-password"
          value={form.password}
          onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="mt-1 w-full gap-2 font-semibold"
        data-testid="register-submit"
      >
        {isSubmitting ? 'Cadastrando...' : 'Criar conta'}
      </Button>
    </form>
  );
}

type LoginFormState = {
  email: string;
  password: string;
};

const INITIAL_LOGIN_FORM: LoginFormState = {
  email: '',
  password: '',
};

type LoginSuccessResponse = {
  token: string;
  user: { id: string; name: string; email: string };
};

function isLoginSuccessResponse(value: unknown): value is LoginSuccessResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).token === 'string'
  );
}

function LoginForm({ inviteToken }: { inviteToken: string | null }) {
  const [form, setForm] = useState<LoginFormState>(INITIAL_LOGIN_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (response.status === 200 && isLoginSuccessResponse(body)) {
        login(body.token);
        await completeInviteIfPresent(body.token, inviteToken, router);
        return;
      }

      if (isApiErrorResponse(body) && body.errors.length > 0) {
        body.errors.forEach((code) => {
          toast.error(getMessage(code));
        });
        return;
      }

      toast.error(getMessage('INTERNAL_SERVER_ERROR'));
    } catch {
      toast.error(getMessage('DEFAULT_API_ERROR'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex w-full flex-col gap-4" onSubmit={handleSubmit} data-testid="login-form">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-email">E-mail</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          data-testid="login-email"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-password">Senha</Label>
        <PasswordInput
          id="login-password"
          autoComplete="current-password"
          dataTestId="login-password"
          value={form.password}
          onChange={(value) => setForm((prev) => ({ ...prev, password: value }))}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="mt-1 w-full gap-2 font-semibold"
        data-testid="login-submit"
      >
        {isSubmitting ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  );
}

function JoinPageContent() {
  const [mode, setMode] = useState<JoinMode>('register');
  const { status } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('convite');

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(PRIVATE_HOME_ROUTE);
    }
  }, [status, router]);

  if (status === 'loading' || status === 'authenticated') {
    return <div aria-busy="true" className="flex min-h-screen items-center justify-center bg-background" />;
  }

  const isRegister = mode === 'register';

  return (
    <div className="flex min-h-screen bg-background text-foreground" data-testid="join-page">
      {/* Painel esquerdo — decorativo/marketing, igual ao mockup (texto fixo, sem dado de API). */}
      <div className="relative hidden flex-1 flex-col overflow-hidden bg-[#0b1220] p-11 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_80%_at_20%_0%,rgba(37,99,235,0.4),transparent_55%)]" />
        <div className="relative">
          <AppLogo size="md" textClassName="text-white" />
        </div>
        <div className="relative mt-auto">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-1 text-xs font-semibold text-slate-300">
            <span className="relative inline-flex size-[7px]">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500" />
              <span className="relative size-[7px] rounded-full bg-emerald-500" />
            </span>
            ao vivo
          </span>
          <h2 className="mb-4 max-w-md text-[32px] font-extrabold leading-[1.15] tracking-tight">
            Onde o time trabalha junto, no mesmo instante.
          </h2>
          <p className="mb-7 max-w-sm text-[15px] leading-relaxed text-slate-300">
            &quot;Migramos do e-mail e das planilhas para o TaskBoard Live. Ver os cartões se moverem
            em tempo real mudou a forma como nosso time de produto trabalha.&quot;
          </p>
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-purple-600 text-sm font-semibold">
              AC
            </span>
            <div>
              <div className="text-sm font-semibold">Ana Beatriz Costa</div>
              <div className="text-xs text-slate-400">Head de Produto · Acme Inc</div>
            </div>
          </div>
        </div>
        <div className="relative mt-8 flex items-center gap-2 text-xs text-slate-500">
          <div className="flex">
            <span className="flex size-7 items-center justify-center rounded-full border-2 border-[#0b1220] bg-emerald-600 text-[10px] font-semibold text-white">
              RO
            </span>
            <span className="-ml-2 flex size-7 items-center justify-center rounded-full border-2 border-[#0b1220] bg-rose-600 text-[10px] font-semibold text-white">
              MS
            </span>
            <span className="-ml-2 flex size-7 items-center justify-center rounded-full border-2 border-[#0b1220] bg-indigo-600 text-[10px] font-semibold text-white">
              LF
            </span>
          </div>
          Mais de 40 mil times já colaboram ao vivo
        </div>
      </div>

      {/* Painel direito — formulário real (registro/login). */}
      <div className="flex w-full flex-col p-6 lg:w-[min(560px,100%)] lg:flex-none">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <h1 className="mb-1.5 text-2xl font-extrabold tracking-tight">
              {isRegister ? 'Crie sua conta' : 'Bem-vindo de volta'}
            </h1>
            <p className="mb-6 text-sm text-muted-foreground">
              {isRegister
                ? 'Comece grátis — leva menos de um minuto.'
                : 'Entre para continuar de onde parou.'}
            </p>

            <div className="mb-6 flex gap-0.5 rounded-xl border border-border bg-muted/60 p-1">
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`h-9 flex-1 rounded-lg text-sm font-semibold transition-colors ${
                  isRegister ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Criar conta
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`h-9 flex-1 rounded-lg text-sm font-semibold transition-colors ${
                  !isRegister ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Entrar
              </button>
            </div>

            {isRegister ? (
              <RegisterForm key="register" />
            ) : (
              <LoginForm key="login" inviteToken={inviteToken} />
            )}

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {isRegister ? 'Já tem uma conta?' : 'Novo no TaskBoard Live?'}{' '}
              <button
                type="button"
                onClick={() => setMode((prev) => (prev === 'register' ? 'login' : 'register'))}
                className="font-semibold text-foreground hover:text-primary"
                data-testid="join-toggle-mode"
              >
                {isRegister ? 'Entrar' : 'Criar conta grátis'}
              </button>
            </div>

            <div className="mt-4 text-center">
              <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
                ← Voltar para o início
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// `JoinPageContent` lê `useSearchParams()` (preserva `?convite=:token`, `026`) — exige um
// limite `Suspense`, mesmo padrão usado em `board-view.component.tsx` (`023`).
export default function JoinPage() {
  return (
    <Suspense
      fallback={<div aria-busy="true" className="flex min-h-screen items-center justify-center bg-background" />}
    >
      <JoinPageContent />
    </Suspense>
  );
}
