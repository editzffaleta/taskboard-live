import Link from 'next/link';
import { Kanban } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-black/80 px-6 backdrop-blur-xl lg:px-10">
        <div className="flex items-center gap-2">
          <Kanban className="size-6 text-blue-500" />
          <span className="text-base font-black tracking-tight">TaskBoard Live</span>
        </div>
        <nav>
          <Link
            href="/join"
            className="text-sm text-white/60 transition-colors hover:text-white"
          >
            Entrar
          </Link>
        </nav>
      </header>

      <main className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_20%,rgba(37,99,235,0.12),transparent)]" />
        <div className="relative flex max-w-2xl flex-col items-center gap-6">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10">
            <Kanban className="size-8 text-blue-500" />
          </div>
          <h1 className="text-4xl font-black leading-tight tracking-tight lg:text-6xl">
            O quadro kanban
            <br />
            <span className="text-blue-500">colaborativo em tempo real</span>
          </h1>
          <p className="max-w-lg text-lg text-white/50">
            Crie quadros, organize cartões e veja sua equipe trabalhar ao vivo —
            atualizações instantâneas para todos que estão no mesmo quadro.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              asChild
              size="lg"
              className="bg-blue-600 font-bold text-white hover:bg-blue-700"
            >
              <Link href="/join">Começar agora</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/join">Ver demonstração</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
