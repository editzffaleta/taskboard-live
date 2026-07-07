import { LABEL_COLORS, type LabelColor } from '@/modules/boards/types/board-state.type';

/**
 * Mapeia cada uma das 7 cores fixas da paleta de etiquetas (mockup `Quadro ao Vivo.dc.html`)
 * para as classes Tailwind equivalentes às variáveis CSS `--lbl-<cor>-bg`/`--lbl-<cor>-fg`
 * (`apps/frontend/src/app/globals.css`). Não inventar cor fora desta lista.
 */
const LABEL_COLOR_CLASSES: Record<LabelColor, string> = {
  red: 'bg-lbl-red-bg text-lbl-red-fg',
  amber: 'bg-lbl-amber-bg text-lbl-amber-fg',
  green: 'bg-lbl-green-bg text-lbl-green-fg',
  blue: 'bg-lbl-blue-bg text-lbl-blue-fg',
  purple: 'bg-lbl-purple-bg text-lbl-purple-fg',
  teal: 'bg-lbl-teal-bg text-lbl-teal-fg',
  pink: 'bg-lbl-pink-bg text-lbl-pink-fg',
};

export function labelColorClasses(color: LabelColor): string {
  return LABEL_COLOR_CLASSES[color] ?? LABEL_COLOR_CLASSES.blue;
}

const LABEL_COLOR_SWATCH_CLASSES: Record<LabelColor, string> = {
  red: 'bg-lbl-red-bg',
  amber: 'bg-lbl-amber-bg',
  green: 'bg-lbl-green-bg',
  blue: 'bg-lbl-blue-bg',
  purple: 'bg-lbl-purple-bg',
  teal: 'bg-lbl-teal-bg',
  pink: 'bg-lbl-pink-bg',
};

export function labelColorSwatchClass(color: LabelColor): string {
  return LABEL_COLOR_SWATCH_CLASSES[color] ?? LABEL_COLOR_SWATCH_CLASSES.blue;
}

export { LABEL_COLORS };
export type { LabelColor };
