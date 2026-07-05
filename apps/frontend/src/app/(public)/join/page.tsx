import Link from 'next/link';
import { Kanban } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export default function JoinPage() {
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
              Entre na sua conta para continuar
            </p>
          </div>
        </div>

        <Button
          asChild
          size="lg"
          className="w-full bg-blue-600 font-bold text-white hover:bg-blue-700"
        >
          <Link href="/boards">Acessar Dashboard</Link>
        </Button>

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
