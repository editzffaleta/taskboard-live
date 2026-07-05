import { TransactionContext } from "./transaction.manager";

export interface UpdateRepository<TUpdateData, TEntity = TUpdateData> {
  update(data: TUpdateData, tx?: TransactionContext): Promise<TEntity>;
}
