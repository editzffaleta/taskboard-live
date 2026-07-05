'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Kanban } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { getMessage } from '@/shared/i18n';
import type { ApiErrorResponse } from '@/shared/types/api-error.type';

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
    <form className="flex w-full flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-name">Nome</Label>
        <Input
          id="register-name"
          name="name"
          type="text"
          autoComplete="name"
          required
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
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="w-full bg-blue-600 font-bold text-white hover:bg-blue-700"
      >
        {isSubmitting ? 'Cadastrando...' : 'Criar conta'}
      </Button>
    </form>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // NOTE: login apenas visual nesta change (003) — a integração funcional com o
    // backend é implementada na change 004 (login).
    event.preventDefault();
  }

  return (
    <form className="flex w-full flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-email">E-mail</Label>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-password">Senha</Label>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full bg-blue-600 font-bold text-white hover:bg-blue-700"
      >
        Entrar
      </Button>
    </form>
  );
}

export default function JoinPage() {
  const [mode, setMode] = useState<JoinMode>('register');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-white">
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
