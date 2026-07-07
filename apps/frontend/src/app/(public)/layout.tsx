'use client';

/**
 * TEMPLATE — app/(public)/layout.tsx
 *
 * Layout do grupo de rotas públicas.
 * Usa PublicBoxedLayout para todas as rotas, exceto /auth/* que renderiza sem wrapper.
 *
 * Ajuste o prefixo isAuthRoute conforme as rotas de autenticação do projeto.
 */

import { usePathname } from 'next/navigation';
import { PublicBoxedLayout } from '@/shared/template/public-boxed-layout.component';

export default function PublicGroupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Landing (`/`), Entrar (`/join`) e Aceitar Convite (`/convite/:token`, `026`) têm layout
  // próprio (fiel aos mockups), por isso não usam o wrapper `PublicBoxedLayout` — apenas
  // rotas públicas futuras sem visual dedicado.
  const hasOwnLayout =
    pathname === '/' ||
    pathname === '/join' ||
    pathname.startsWith('/join/') ||
    pathname.startsWith('/convite/');

  if (hasOwnLayout) {
    return <>{children}</>;
  }

  return <PublicBoxedLayout>{children}</PublicBoxedLayout>;
}
