import { PageResult } from "@taskboard/shared";
import { Activity } from "../../src/activity/model";
import {
  ActivityRepository,
  FindAllByBoardIdParams,
} from "../../src/activity/provider";

export class FakeActivityRepository implements ActivityRepository {
  readonly activities: Activity[] = [];

  async create(activity: Activity): Promise<Activity> {
    this.activities.push(activity);
    return activity;
  }

  async findAllByBoardId(
    params: FindAllByBoardIdParams,
  ): Promise<PageResult<Activity>> {
    const all = this.activities
      .filter((activity) => activity.boardId === params.boardId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const start = (params.page - 1) * params.perPage;
    const items = all.slice(start, start + params.perPage);

    return {
      items,
      page: params.page,
      perPage: params.perPage,
      total: all.length,
    };
  }
}
