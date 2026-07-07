/**
 * Cor de destaque do quadro (apresentação pura, sem estado nem chamada de rede).
 *
 * Desde a `020`, o `Board` ganhou o campo `color`, restrito à paleta fechada de 7 tokens
 * (`BOARD_COLORS`, mesmos tokens do backend: `blue|purple|green|red|amber|cyan|slate`,
 * mapeados aqui para os hex do mockup `Configuracoes do Quadro.dc.html` via classes Tailwind
 * equivalentes). `resolveBoardColor` é a função a usar: prioriza `board.color` quando
 * presente e só recorre ao hash determinístico (paleta legada da `015`) como fallback para
 * quadros sem cor (antes da migration).
 *
 * Desvio do `design.md`: o caminho sugerido era `modules/boards/utils/` (plural); mantido em
 * `modules/boards/util/` (singular) para seguir a convenção já existente no módulo
 * (`util/board-state.reducer.ts`, `util/activity-label.util.ts`).
 */

import { BOARD_COLORS, type BoardColor } from '@/modules/boards/types/board-state.type';

export type BoardAccentColor = {
  /** Classe Tailwind do ponto/indicador sólido (sidebar, avatar). */
  dot: string;
  /** Classes do gradiente de capa do card (`from-*` `to-*`). */
  gradient: string;
};

/** Mapeamento fechado dos 7 tokens de `BOARD_COLORS` (`020`) → classes Tailwind. */
const BOARD_COLOR_ACCENTS: Record<BoardColor, BoardAccentColor> = {
  blue: { dot: 'bg-primary', gradient: 'from-primary to-blue-700' },
  purple: { dot: 'bg-violet-600', gradient: 'from-violet-600 to-violet-800' },
  green: { dot: 'bg-emerald-600', gradient: 'from-emerald-600 to-emerald-800' },
  red: { dot: 'bg-rose-600', gradient: 'from-rose-600 to-rose-800' },
  amber: { dot: 'bg-amber-600', gradient: 'from-amber-600 to-amber-800' },
  cyan: { dot: 'bg-cyan-600', gradient: 'from-cyan-600 to-cyan-800' },
  slate: { dot: 'bg-slate-600', gradient: 'from-slate-600 to-slate-800' },
};

/** Hex do mockup para os swatches de seleção (`board-settings.component.tsx`). */
export const BOARD_COLOR_HEX: Record<BoardColor, string> = {
  blue: '#2563EB',
  purple: '#7C3AED',
  green: '#059669',
  red: '#E11D48',
  amber: '#D97706',
  cyan: '#0891B2',
  slate: '#475569',
};

const BOARD_ACCENT_PALETTE: BoardAccentColor[] = BOARD_COLORS.map((token) => BOARD_COLOR_ACCENTS[token]);

function hashBoardId(boardId: string): number {
  let hash = 0;
  for (let i = 0; i < boardId.length; i += 1) {
    hash = (hash * 31 + boardId.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Mesma entrada da paleta para o mesmo `boardId`, sempre (fallback determinístico). */
export function getBoardAccentColor(boardId: string): BoardAccentColor {
  const index = hashBoardId(boardId) % BOARD_ACCENT_PALETTE.length;
  return BOARD_ACCENT_PALETTE[index]!;
}

/**
 * Resolve a cor de destaque de um quadro: usa `board.color` (paleta `BOARD_COLORS`, `020`)
 * quando presente; cai para o hash determinístico legado (`015`) quando `color` é `null`
 * (quadro anterior à migration, sem cor persistida).
 */
export function resolveBoardColor(board: { id: string; color?: BoardColor | null }): BoardAccentColor {
  if (board.color) {
    return BOARD_COLOR_ACCENTS[board.color];
  }
  return getBoardAccentColor(board.id);
}
