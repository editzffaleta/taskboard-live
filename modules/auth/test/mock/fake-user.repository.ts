import { PageResult, TransactionContext } from "@taskboard/shared";
import { User } from "../../src/user/model";
import { UserPageParams, UserRepository } from "../../src/user/provider";

export class FakeUserRepository implements UserRepository {
  readonly users: User[] = [];

  async create(entity: User, _tx?: TransactionContext): Promise<User> {
    this.users.push(entity);
    return entity;
  }

  async update(entity: User, _tx?: TransactionContext): Promise<User> {
    const index = this.users.findIndex((user) => user.id === entity.id);
    if (index >= 0) {
      this.users[index] = entity;
    }
    return entity;
  }

  async delete(id: string, _tx?: TransactionContext): Promise<void> {
    const index = this.users.findIndex((user) => user.id === id);
    if (index >= 0) {
      this.users.splice(index, 1);
    }
  }

  async findById(id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async findPage(_params: UserPageParams): Promise<PageResult<User>> {
    return {
      items: this.users,
      page: 1,
      perPage: this.users.length,
      total: this.users.length,
    };
  }
}
