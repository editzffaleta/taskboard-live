import { MemberDirectory, MemberDirectoryUser } from "../../src/membership/provider";

export class FakeMemberDirectory implements MemberDirectory {
  constructor(readonly users: MemberDirectoryUser[] = []) {}

  async findByEmail(email: string): Promise<MemberDirectoryUser | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async findById(id: string): Promise<MemberDirectoryUser | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }
}
