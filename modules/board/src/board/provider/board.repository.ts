import { FindByIdRepository } from "@taskboard/shared";
import { Board } from "../model";
import { Membership } from "../../membership/model";

export interface CreateBoardWithOwnerInput {
  name: string;
  ownerId: string;
}

export interface BoardRepository extends FindByIdRepository<Board> {
  /**
   * Cria o `Board` e, na mesma transacao, o `BoardMember` `role='owner'` para
   * `ownerId`. Mantem a atomicidade da criacao sem vazar transacao Prisma para
   * o dominio (decisao registrada na task 1.5 do design.md).
   */
  createWithOwnerMembership(
    input: CreateBoardWithOwnerInput,
  ): Promise<{ board: Board; membership: Membership }>;
  update(entity: Board): Promise<Board>;
  delete(id: string): Promise<void>;
  findManyByIds(ids: string[]): Promise<Board[]>;
  archive(id: string, archivedAt: Date): Promise<void>;
  restore(id: string): Promise<void>;
  findAllArchivedByOwnerId(ownerId: string): Promise<Board[]>;
  /**
   * Busca quadros nao arquivados, dentre `ids` (ja restritos por membership no
   * caso de uso `Search`), cujo `name` contem `query` (case-insensitive),
   * limitado a `limit` itens (change `023`).
   */
  searchByIds(ids: string[], query: string, limit: number): Promise<Board[]>;
}
