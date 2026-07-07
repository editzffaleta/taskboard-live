/**
 * Cor de destaque determinística por quadro (apresentação pura, sem estado nem chamada de
 * rede). O domínio (`Board`) não tem campo de cor persistido — o mesmo `boardId` sempre
 * resolve para a mesma entrada da paleta, usada tanto na capa do card do dashboard
 * (`board-card.component.tsx`) quanto no indicador da sidebar (`app-sidebar-navigation`).
 *
 * Desvio do `design.md`: o caminho sugerido era `modules/boards/utils/` (plural); mantido em
 * `modules/boards/util/` (singular) para seguir a convenção já existente no módulo
 * (`util/board-state.reducer.ts`, `util/activity-label.util.ts`).
 */

export type BoardAccentColor = {
  /** Classe Tailwind do ponto/indicador sólido (sidebar, avatar). */
  dot: string;
  /** Classes do gradiente de capa do card (`from-*` `to-*`). */
  gradient: string;
};

const BOARD_ACCENT_PALETTE: BoardAccentColor[] = [
  { dot: 'bg-primary', gradient: 'from-primary to-blue-700' },
  { dot: 'bg-violet-500', gradient: 'from-violet-500 to-violet-700' },
  { dot: 'bg-rose-500', gradient: 'from-rose-500 to-rose-700' },
  { dot: 'bg-cyan-600', gradient: 'from-cyan-600 to-cyan-800' },
  { dot: 'bg-amber-600', gradient: 'from-amber-600 to-amber-800' },
  { dot: 'bg-emerald-600', gradient: 'from-emerald-600 to-emerald-800' },
];

function hashBoardId(boardId: string): number {
  let hash = 0;
  for (let i = 0; i < boardId.length; i += 1) {
    hash = (hash * 31 + boardId.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Mesma entrada da paleta para o mesmo `boardId`, sempre. */
export function getBoardAccentColor(boardId: string): BoardAccentColor {
  const index = hashBoardId(boardId) % BOARD_ACCENT_PALETTE.length;
  return BOARD_ACCENT_PALETTE[index]!;
}
