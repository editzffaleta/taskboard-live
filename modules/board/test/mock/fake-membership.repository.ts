import { Membership, MembershipRole } from "../../src/membership/model";
import { MembershipRepository } from "../../src/membership/provider";

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
    boardId: string,
    userId: string,
    role: MembershipRole,
  ): Promise<Membership> {
    const membership = new Membership({ boardId, userId, role });
    membership.validate();
    this.memberships.push(membership);
    return membership;
  }

  async delete(boardId: string, userId: string): Promise<void> {
    const index = this.memberships.findIndex(
      (membership) => membership.boardId === boardId && membership.userId === userId,
    );
    if (index >= 0) {
      this.memberships.splice(index, 1);
    }
  }
}
