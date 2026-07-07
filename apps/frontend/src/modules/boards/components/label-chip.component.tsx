import { labelColorClasses } from '@/modules/boards/util/label-color.util';
import type { LabelState } from '@/modules/boards/types/board-state.type';

type LabelChipProps = {
  label: LabelState;
};

/**
 * Chip de etiqueta colorida, reproduzindo a paleta exata do mockup (`--lbl-<cor>-bg`/
 * `--lbl-<cor>-fg` de `Quadro ao Vivo.dc.html`, mapeadas para tokens Tailwind do tema).
 */
export function LabelChip({ label }: LabelChipProps) {
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${labelColorClasses(label.color)}`}
      data-testid="label-chip"
      data-label-id={label.id}
    >
      {label.name}
    </span>
  );
}
