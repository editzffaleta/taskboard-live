import { ActivityRecorder } from "../../src/activity/provider";

export class FakeActivityRecorder implements ActivityRecorder {
  readonly calls: {
    boardId: string;
    actorId: string;
    type: string;
    data: Record<string, unknown>;
  }[] = [];

  async record(
    boardId: string,
    actorId: string,
    type: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    this.calls.push({ boardId, actorId, type, data });
  }
}
