import { PageResult } from "@taskboard/shared";
import { Activity } from "../model";

export interface FindAllByBoardIdParams {
  boardId: string;
  page: number;
  perPage: number;
}

export interface ActivityRepository {
  create(activity: Activity): Promise<Activity>;
  /**
   * Retorna a página de atividades do quadro ordenadas por `createdAt`
   * decrescente (mais recente primeiro).
   */
  findAllByBoardId(
    params: FindAllByBoardIdParams,
  ): Promise<PageResult<Activity>>;
}
