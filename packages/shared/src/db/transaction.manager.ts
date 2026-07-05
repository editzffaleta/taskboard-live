/**
 * Abstrai transacoes sem expor o ORM.
 *
 * A implementacao concreta (ex.: Prisma) fornece o `TransactionContext` — o client
 * transacional — e executa a operacao dentro de uma transacao. Os repositorios podem
 * aceitar um `tx?: TransactionContext` opcional para participar de uma transacao em
 * andamento (ver nota em COMO-APLICAR.md).
 *
 * Mantem o estilo do shared: a operacao retorna `Promise<T>` (sem `Result`).
 */
export interface TransactionContext {}

export interface TransactionManager<
  TContext extends TransactionContext = TransactionContext,
> {
  runInTransaction<T>(operation: (context: TContext) => Promise<T>): Promise<T>;
}
