import { TransactionContext } from "./transaction.manager";

export interface CreateRepository<TCreateData, TEntity = TCreateData> {
  create(data: TCreateData, tx?: TransactionContext): Promise<TEntity>;
}
