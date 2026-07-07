import { Button } from '@/shared/components/ui/button';
import { getMessage } from '@/shared/i18n';
import { resolveBoardColor } from '@/modules/boards/util/board-color.util';
import type { BoardTemplate } from '@/modules/templates/api/templates.api';

type TemplateCardProps = {
  template: BoardTemplate;
  isSubmitting: boolean;
  onUse: (template: BoardTemplate) => void;
};

/**
 * Card de modelo da galeria `/templates` (`025`), reproduzindo `Modelos.dc.html`: capa em
 * gradiente com a prévia das colunas (barras), nome + badge de categoria, descrição e o botão
 * "Usar modelo". Cor da capa reaproveita `resolveBoardColor` (paleta `BOARD_COLORS` de `020`).
 */
export function TemplateCard({ template, isSubmitting, onUse }: TemplateCardProps) {
  const accent = resolveBoardColor({ id: template.id, color: template.color });

  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-lg"
      data-testid="template-card"
    >
      <div className={`flex h-[120px] gap-1.5 bg-gradient-to-br p-3 ${accent.gradient}`} aria-hidden>
        {template.lists.map((list, index) => (
          <div key={index} className="flex flex-1 flex-col gap-1 rounded-md bg-white/20 p-1.5">
            <div className="h-1.5 w-4/5 rounded-sm bg-white/80" />
            <div className="h-1.5 w-3/5 rounded-sm bg-white/80" />
          </div>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold">{template.name}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
            {template.category}
          </span>
        </div>
        <p className="flex-1 text-[12.5px] leading-relaxed text-muted-foreground">
          {template.description}
        </p>
        <Button
          type="button"
          className="w-full"
          disabled={isSubmitting}
          onClick={() => onUse(template)}
          data-testid="template-card-use"
        >
          {isSubmitting ? getMessage('templates.using') : getMessage('templates.use')}
        </Button>
      </div>
    </div>
  );
}
