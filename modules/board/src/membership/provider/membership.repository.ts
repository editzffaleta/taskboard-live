import { Membership, MembershipRole } from "../model";

export interface MembershipRepository {
  findByBoardAndUser(
    boardId: string,
    userId: string,
  ): Promise<Membership | null>;
  listBoardsByUser(userId: string): Promise<Membership[]>;
  create(
    boardId: string,
    userId: string,
    role: MembershipRole,
  ): Promise<Membership>;
}
