import { LayoutGrid, SearchX } from 'lucide-react';
import { SystemState } from '@/shared/components/ui/system-state.component';

export default function PrivateNotFound() {
  return (
    <SystemState
      icon={SearchX}
      title="Página não encontrada"
      description="O quadro ou cartão que você procura foi movido, arquivado ou nunca existiu."
      action={{ label: 'Voltar aos quadros', href: '/boards', icon: LayoutGrid }}
    />
  );
}
