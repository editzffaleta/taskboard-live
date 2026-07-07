import { FindByIdRepository } from "@taskboard/shared";
import { Board } from "../model";
import { Membership } from "../../membership/model";
import { List } from "../../list/model";
import { Card } from "../../card/model";

export interface CreateBoardWithOwnerInput {
  name: string;
  ownerId: string;
}

export interface CreateBoardFromTemplateInput {
  name: string;
  ownerId: string;
  lists: { title: string; cards: { title: string }[] }[];
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
  /**
   * Cria o `Board`, o `BoardMember` owner, todas as `List`s (posicao
   * sequencial 0..N-1) e todos os `Card`s de exemplo de cada lista (posicao
   * sequencial 0..M-1 por lista) atomicamente, a partir de um modelo de
   * quadro (change `025`). Nenhum registro e persistido se qualquer etapa
   * falhar.
   */
  createFromTemplate(
    input: CreateBoardFromTemplateInput,
  ): Promise<{
    board: Board;
    membership: Membership;
    lists: List[];
    cards: Card[];
  }>;
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
