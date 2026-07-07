import { Comment } from "../model";

export interface CommentRepository {
  create(comment: Comment): Promise<Comment>;
  findById(id: string): Promise<Comment | null>;
  /**
   * Retorna os comentarios do cartao, do mais recente para o mais antigo
   * (`createdAt DESC`), paginados por `page`/`pageSize` (1-indexado).
   */
  findAllByCardId(
    cardId: string,
    page: number,
    pageSize: number,
  ): Promise<Comment[]>;
  countByCardId(cardId: string): Promise<number>;
  delete(id: string): Promise<void>;
}
