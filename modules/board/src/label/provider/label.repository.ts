import { Label } from "../model";

export interface LabelRepository {
  create(label: Label): Promise<Label>;
  findById(id: string): Promise<Label | null>;
  findAllByBoardId(boardId: string): Promise<Label[]>;
  update(label: Label): Promise<Label>;
  delete(id: string): Promise<void>;
}
