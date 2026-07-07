import { cn } from '@/shared/lib/class-name.util';

/**
 * Bloco genérico `animate-pulse` reproduzindo os retângulos de carregamento de
 * `mockups/Estados de Sistema.dc.html`. Sem estado/dado interno — só recebe classes de
 * tamanho via `className`.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      aria-hidden="true"
      {...props}
    />
  );
}
