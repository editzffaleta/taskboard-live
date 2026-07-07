import type {
  Membership,
  MembershipRepository,
  MembershipRole,
} from "@taskboard/board";

export class FakeMembershipRepository implements MembershipRepository {
  constructor(readonly memberships: Membership[] = []) {}

  async findByBoardAndUser(
    boardId: string,
    userId: string,
  ): Promise<Membership | null> {
    return (
      this.memberships.find(
        (membership) =>
          membership.boardId === boardId && membership.userId === userId,
      ) ?? null
    );
  }

  async listBoardsByUser(userId: string): Promise<Membership[]> {
    return this.memberships.filter(
      (membership) => membership.userId === userId,
    );
  }

  async listByBoardId(boardId: string): Promise<Membership[]> {
    return this.memberships.filter(
      (membership) => membership.boardId === boardId,
    );
  }

  async create(
    _boardId: string,
    _userId: string,
    _role: MembershipRole,
  ): Promise<Membership> {
    throw new Error("not implemented in fake used by auth tests");
  }

  async delete(boardId: string, userId: string): Promise<void> {
    const index = this.memberships.findIndex(
      (membership) =>
        membership.boardId === boardId && membership.userId === userId,
    );
    if (index >= 0) {
      this.memberships.splice(index, 1);
    }
  }
}
