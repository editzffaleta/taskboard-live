import type { LabelColor } from '@/modules/boards/types/board-state.type';
import { labelColorSwatchClass } from '@/modules/boards/util/label-color.util';

type CardDetailCoverBannerProps = {
  cover: LabelColor | null;
};

/**
 * Faixa de capa no topo da coluna principal do modal de detalhe (`033`/`031`), renderizada só
 * quando `cover !== null` — sem espaço reservado quando não há capa, sem regressão de layout.
 */
export function CardDetailCoverBanner({ cover }: CardDetailCoverBannerProps) {
  if (cover === null) return null;

  return (
    <div
      className={`-mx-6 -mt-5 mb-5 h-10 shrink-0 ${labelColorSwatchClass(cover)}`}
      data-testid="card-detail-cover-banner"
      data-cover-color={cover}
    />
  );
}
