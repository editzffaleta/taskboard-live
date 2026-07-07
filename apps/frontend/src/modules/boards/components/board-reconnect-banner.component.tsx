import { Loader2 } from 'lucide-react';

type BoardReconnectBannerProps = {
  attempt: number;
};

/**
 * Reproduz o indicador "Reconectando… tentativa N" de `mockups/Estados de Sistema.dc.html`.
 * `attempt` vem do evento nativo `reconnect_attempt` do `socket.io-client` (nenhum contador
 * próprio é inventado).
 */
export function BoardReconnectBanner({ attempt }: BoardReconnectBannerProps) {
  return (
    <div
      className="flex items-center justify-center gap-2.5 rounded-xl border border-warning/30 bg-warning/15 px-4 py-2.5"
      data-testid="board-reconnect-banner"
      role="status"
    >
      <Loader2 className="size-4 animate-spin text-warning" />
      <span className="text-sm font-semibold text-warning">
        {attempt > 0 ? `Reconectando… tentativa ${attempt}` : 'Sem conexão — tentando reconectar…'}
      </span>
    </div>
  );
}
