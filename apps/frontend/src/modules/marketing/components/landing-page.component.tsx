import Link from 'next/link';
import { ArrowRight, Eye, History, Lock, PlayCircle, Users, Zap } from 'lucide-react';
import { AppLogo } from '@/shared/components/branding/app-logo.component';
import { Badge } from '@/shared/components/ui/badge';
import { ThemeToggle } from '@/shared/components/theme/theme-toggle.component';
import { buttonVariants } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/class-name.util';

const NAV_LINKS = [
  { label: 'Recursos', href: '#recursos' },
  { label: 'Como funciona', href: '#' },
  { label: 'Preços', href: '#' },
  { label: 'Modelos', href: '#' },
];

const FEATURES = [
  {
    icon: Zap,
    iconClassName: 'bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300',
    title: 'Tempo real de verdade',
    description:
      'Cada arraste, comentário e edição aparece instantaneamente para todo mundo. Sem F5, sem conflito.',
  },
  {
    icon: Users,
    iconClassName: 'bg-purple-500/10 text-purple-600 dark:bg-purple-400/15 dark:text-purple-300',
    title: 'Colaboração fluida',
    description:
      'Convide o time por e-mail ou link. Papéis de proprietário e membro mantêm tudo no controle.',
  },
  {
    icon: Eye,
    iconClassName: 'bg-success/10 text-success dark:bg-success/15',
    title: 'Presença ao vivo',
    description:
      'Veja quem está online agora e qual cartão cada pessoa está movendo, com avatares em tempo real.',
  },
  {
    icon: History,
    iconClassName: 'bg-amber-500/10 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300',
    title: 'Feed de atividade',
    description:
      'Um histórico completo de quem fez o quê e quando — com tempo relativo e agrupado por dia.',
  },
];

/**
 * Prévia estática (ilustrativa) do quadro kanban usada no hero da landing.
 * Reproduz `mockups/Landing.dc.html`: nenhum dado vem de API, é decoração fixa.
 */
function BoardPreview() {
  return (
    <div className="relative mx-auto mt-12 max-w-4xl">
      <div className="absolute -top-4 right-3 z-10 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg">
        <div className="flex">
          <span className="flex size-[26px] items-center justify-center rounded-full border-2 border-card bg-purple-600 text-[10px] font-semibold text-white">
            AC
          </span>
          <span className="-ml-2 flex size-[26px] items-center justify-center rounded-full border-2 border-card bg-emerald-600 text-[10px] font-semibold text-white">
            RO
          </span>
          <span className="-ml-2 flex size-[26px] items-center justify-center rounded-full border-2 border-card bg-rose-600 text-[10px] font-semibold text-white">
            MS
          </span>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">3 online</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card text-left shadow-2xl">
        <div className="flex h-10 items-center gap-2 border-b border-border bg-muted/60 px-3.5">
          <span className="size-2.5 rounded-full bg-red-400" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-emerald-400" />
          <div className="mx-auto flex h-6 max-w-xs flex-1 items-center gap-1.5 rounded-md border border-border bg-card px-2.5">
            <Lock className="size-3.5 text-muted-foreground" />
            <span className="font-mono text-[11px] text-muted-foreground">
              taskboard.live/b/sprint-42
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2 py-0.5 text-[10.5px] font-semibold text-success">
            <span className="size-1.5 rounded-full bg-success" />
            ao vivo
          </span>
        </div>
        <div className="flex gap-3 overflow-hidden bg-background p-4">
          <div className="w-[200px] shrink-0 rounded-xl border border-border bg-muted/50 p-2.5">
            <div className="mb-2 px-0.5 text-xs font-bold">A Fazer</div>
            <div className="mb-2 rounded-lg border border-border bg-card p-2.5 shadow-sm">
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-500/20 dark:text-red-300">
                Bug
              </span>
              <div className="mt-1.5 text-xs font-medium">Corrigir sync offline</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-2.5 shadow-sm">
              <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
                Design
              </span>
              <div className="mt-1.5 text-xs font-medium">Redesenhar onboarding</div>
            </div>
          </div>
          <div className="relative w-[200px] shrink-0 rounded-xl border border-border bg-muted/50 p-2.5">
            <div className="mb-2 px-0.5 text-xs font-bold">Em Progresso</div>
            <div className="mb-2 h-[52px] rounded-lg border-2 border-dashed border-primary bg-primary/10" />
            <div className="rounded-lg border border-border bg-card p-2.5 shadow-sm">
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                Frontend
              </span>
              <div className="mt-1.5 text-xs font-medium">Editor de markdown</div>
            </div>
          </div>
          <div className="w-[200px] shrink-0 rounded-xl border border-border bg-muted/50 p-2.5">
            <div className="mb-2 px-0.5 text-xs font-bold">Concluído</div>
            <div className="rounded-lg border border-border bg-card p-2.5 opacity-70 shadow-sm">
              <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700 dark:bg-teal-500/20 dark:text-teal-300">
                Backend
              </span>
              <div className="mt-1.5 text-xs font-medium line-through">Login social</div>
            </div>
          </div>
          <div className="absolute left-[250px] top-[104px] hidden w-[190px] rounded-lg border border-primary bg-card p-2.5 shadow-lg sm:block">
            <span className="absolute -left-1 -top-2.5 rounded-tl-full rounded-tr-full rounded-br-full bg-emerald-600 px-1.5 py-0.5 text-[9.5px] font-semibold text-white">
              Rafael
            </span>
            <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700 dark:bg-teal-500/20 dark:text-teal-300">
              Backend
            </span>
            <div className="mt-1.5 text-xs font-medium">Servidor de presença</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex h-[66px] max-w-6xl items-center gap-3.5 px-6">
          <AppLogo size="md" />
          <nav className="ml-5 hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex-1" />
          <ThemeToggle />
          <Link
            href="/join"
            className="rounded-lg px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Entrar
          </Link>
          <Link href="/join" className={cn(buttonVariants({ size: 'sm' }), 'font-semibold shadow-sm')}>
            Começar grátis
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-6 pb-10 pt-16 text-center sm:pt-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(37,99,235,0.12),transparent_55%)]" />
          <div className="relative mx-auto max-w-3xl">
            <Badge
              variant="outline"
              className="mb-6 gap-2 rounded-full border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm"
            >
              <span className="relative inline-flex size-[7px]">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500" />
                <span className="relative size-[7px] rounded-full bg-emerald-500" />
              </span>
              Colaboração em tempo real
            </Badge>
            <h1 className="mb-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Veja os cartões se
              <br />
              moverem <span className="text-primary">ao vivo</span>
            </h1>
            <p className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              O quadro kanban onde seu time trabalha junto, no mesmo instante. Arraste, comente e
              acompanhe cada mudança acontecendo em tempo real.
            </p>
            <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/join"
                className={cn(buttonVariants({ size: 'lg' }), 'gap-2 font-semibold shadow-md')}
              >
                Começar grátis
                <ArrowRight className="size-5" />
              </Link>
              <Link
                href="/join"
                className={cn(
                  buttonVariants({ size: 'lg', variant: 'outline' }),
                  'gap-2 font-semibold shadow-sm',
                )}
              >
                <PlayCircle className="size-5" />
                Ver demonstração
              </Link>
            </div>
            <div className="text-xs text-muted-foreground">
              Grátis para até 10 pessoas · Não pedimos cartão de crédito
            </div>
          </div>

          <BoardPreview />
        </section>

        <section className="px-6 py-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Times de produto que trabalham em tempo real
            </div>
            <div className="flex flex-wrap items-center justify-center gap-8 text-lg font-bold tracking-tight text-muted-foreground opacity-60">
              <span>Nuvem</span>
              <span>Órbita</span>
              <span>Vértice</span>
              <span>Fluxo</span>
              <span>Lumen</span>
              <span>Prisma</span>
            </div>
          </div>
        </section>

        <section id="recursos" className="px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto mb-11 max-w-xl text-center">
              <h2 className="mb-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Feito para o trabalho em conjunto
              </h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                Tudo que seu time precisa para se manter em sincronia — sem recarregar a página, sem
                versões desencontradas.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm"
                >
                  <div
                    className={cn(
                      'mb-4 flex size-[46px] items-center justify-center rounded-xl',
                      feature.iconClassName,
                    )}
                  >
                    <feature.icon className="size-6" />
                  </div>
                  <h3 className="mb-2 text-[17px] font-bold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 pb-20 pt-5">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[22px] bg-[#0b1220] px-8 py-14 text-center sm:px-11">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_120%_at_50%_-10%,rgba(37,99,235,0.35),transparent_55%)]" />
            <div className="relative">
              <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Comece a colaborar em segundos
              </h2>
              <p className="mx-auto mb-6 max-w-md text-base leading-relaxed text-slate-300">
                Crie seu primeiro quadro, convide o time e veja tudo se mover ao vivo. É grátis para
                começar.
              </p>
              <Link
                href="/join"
                className="inline-flex h-[50px] items-center gap-2 rounded-xl bg-white px-6 text-[15px] font-bold text-[#0b1220] shadow-lg transition-opacity hover:opacity-90"
              >
                Criar meu quadro grátis
                <ArrowRight className="size-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-muted/40 px-6 pb-8 pt-12">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-7 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <div className="mb-3">
              <AppLogo size="sm" />
            </div>
            <p className="max-w-[250px] text-sm leading-relaxed text-muted-foreground">
              O quadro kanban colaborativo em tempo real para times de produto.
            </p>
          </div>
          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Produto
            </div>
            <div className="flex flex-col gap-2.5">
              <a href="#recursos" className="text-sm text-muted-foreground hover:text-foreground">
                Recursos
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Preços
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Modelos
              </a>
            </div>
          </div>
          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Empresa
            </div>
            <div className="flex flex-col gap-2.5">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Sobre
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Contato
              </a>
            </div>
          </div>
          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Recursos
            </div>
            <div className="flex flex-col gap-2.5">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Central de ajuda
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Status
              </a>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-8 flex max-w-5xl flex-wrap items-center gap-3 border-t border-border pt-6">
          <span className="text-xs text-muted-foreground">
            © 2026 TaskBoard Live. Todos os direitos reservados.
          </span>
          <div className="flex-1" />
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Todos os sistemas operacionais
          </span>
        </div>
      </footer>
    </div>
  );
}
