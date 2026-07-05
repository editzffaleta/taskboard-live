import { TransactionContext } from "./transaction.manager";

export interface DeleteRepository<TId = string> {
  delete(id: TId, tx?: TransactionContext): Promise<void>;
}
