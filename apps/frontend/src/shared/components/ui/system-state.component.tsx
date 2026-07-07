import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';

type SystemStateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  variant?: 'default' | 'outline';
};

type SystemStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: SystemStateAction;
  secondaryAction?: SystemStateAction;
  /** Texto monoespaçado opcional (ex.: identificador de erro), como no mockup de erro. */
  meta?: string;
  className?: string;
};

/**
 * Componente genérico (sem estado interno de dado) que reproduz o cartão central de
 * `mockups/Estados de Sistema.dc.html`: ícone grande, título, descrição e ação(ões).
 * Usado por `not-found.tsx` e `error.tsx`.
 */
export function SystemState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  meta,
}: SystemStateProps) {
  return (
    <div className="flex h-full min-h-[70vh] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-6 flex size-24 items-center justify-center rounded-3xl bg-primary/10 text-primary">
        <Icon className="size-12" />
      </div>
      <h1 className="mb-2.5 text-2xl font-extrabold tracking-tight">{title}</h1>
      <p className="mb-6 max-w-md text-[14.5px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      {meta ? (
        <div className="mb-6 rounded-lg border border-border bg-muted/60 px-2.5 py-1 font-mono text-[11.5px] text-muted-foreground">
          {meta}
        </div>
      ) : null}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {action ? <SystemStateActionButton action={action} primary /> : null}
          {secondaryAction ? <SystemStateActionButton action={secondaryAction} /> : null}
        </div>
      )}
    </div>
  );
}

function SystemStateActionButton({
  action,
  primary,
}: {
  action: SystemStateAction;
  primary?: boolean;
}) {
  const variant = action.variant ?? (primary ? 'default' : 'outline');
  const content = (
    <>
      {action.icon ? <action.icon className="size-4.5" /> : null}
      {action.label}
    </>
  );

  if (action.href) {
    return (
      <Button asChild size="lg" variant={variant} className="gap-2 font-semibold">
        <Link href={action.href}>{content}</Link>
      </Button>
    );
  }

  return (
    <Button size="lg" variant={variant} className="gap-2 font-semibold" onClick={action.onClick}>
      {content}
    </Button>
  );
}
