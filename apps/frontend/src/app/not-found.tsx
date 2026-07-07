import { LayoutGrid, SearchX } from 'lucide-react';
import { SystemState } from '@/shared/components/ui/system-state.component';

/**
 * 404 para rotas fora do grupo `(private)` (ex.: URL totalmente inexistente).
 * Reaproveita o mesmo `SystemState` de `app/(private)/not-found.tsx` para não duplicar
 * o mockup em dois lugares — só o destino da ação muda para `/` (raiz pública).
 */
export default function RootNotFound() {
  return (
    <SystemState
      icon={SearchX}
      title="Página não encontrada"
      description="O quadro ou cartão que você procura foi movido, arquivado ou nunca existiu."
      action={{ label: 'Voltar ao início', href: '/', icon: LayoutGrid }}
    />
  );
}
