import { Comment } from "../../src/comment/model";
import { CommentRepository } from "../../src/comment/provider";

export class FakeCommentRepository implements CommentRepository {
  readonly comments: Comment[] = [];

  async create(comment: Comment): Promise<Comment> {
    this.comments.push(comment);
    return comment;
  }

  async findById(id: string): Promise<Comment | null> {
    return this.comments.find((comment) => comment.id === id) ?? null;
  }

  async findAllByCardId(
    cardId: string,
    page: number,
    pageSize: number,
  ): Promise<Comment[]> {
    const sorted = this.comments
      .filter((comment) => comment.cardId === cardId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }

  async countByCardId(cardId: string): Promise<number> {
    return this.comments.filter((comment) => comment.cardId === cardId).length;
  }

  async delete(id: string): Promise<void> {
    const index = this.comments.findIndex((comment) => comment.id === id);
    if (index >= 0) {
      this.comments.splice(index, 1);
    }
  }
}
