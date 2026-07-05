'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Kanban } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { getMessage } from '@/shared/i18n';
import type { ApiErrorResponse } from '@/shared/types/api-error.type';
import { useAuth } from '@/modules/auth/context/auth.context';

const PRIVATE_HOME_ROUTE = '/boards';

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
        <Input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          data-testid="register-password"
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="w-full bg-blue-600 font-bold text-white hover:bg-blue-700"
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

function LoginForm() {
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
        router.push(PRIVATE_HOME_ROUTE);
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
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          data-testid="login-password"
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="w-full bg-blue-600 font-bold text-white hover:bg-blue-700"
        data-testid="login-submit"
      >
        {isSubmitting ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  );
}

export default function JoinPage() {
  const [mode, setMode] = useState<JoinMode>('register');
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(PRIVATE_HOME_ROUTE);
    }
  }, [status, router]);

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div
        aria-busy="true"
        className="flex min-h-screen items-center justify-center bg-black"
      />
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-white"
      data-testid="join-page"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10">
            <Kanban className="size-7 text-blue-500" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight">TaskBoard Live</h1>
            <p className="mt-1 text-sm text-white/50">
              {mode === 'register' ? 'Crie sua conta para começar' : 'Entre na sua conta para continuar'}
            </p>
          </div>
        </div>

        {mode === 'register' ? <RegisterForm key="register" /> : <LoginForm key="login" />}

        <button
          type="button"
          onClick={() => setMode((prev) => (prev === 'register' ? 'login' : 'register'))}
          className="text-xs text-white/50 transition-colors hover:text-white/80"
          data-testid="join-toggle-mode"
        >
          {mode === 'register' ? 'Já tem uma conta? Entrar' : 'Não tem uma conta? Cadastre-se'}
        </button>

        <Link
          href="/"
          className="text-xs text-white/30 transition-colors hover:text-white/60"
        >
          ← Voltar para o início
        </Link>
      </div>
    </div>
  );
}
