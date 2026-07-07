'use client';

import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { SystemState } from '@/shared/components/ui/system-state.component';

type PrivateErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function PrivateError({ error, reset }: PrivateErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <SystemState
      icon={RefreshCw}
      title="Algo deu errado"
      description="Encontramos um erro inesperado ao carregar esta página. Tente novamente em instantes."
      meta={error.digest ? `erro #${error.digest}` : undefined}
      action={{ label: 'Tentar novamente', icon: RefreshCw, onClick: reset }}
      secondaryAction={{ label: 'Voltar aos quadros', href: '/boards' }}
    />
  );
}
