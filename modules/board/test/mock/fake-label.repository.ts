import { Label } from "../../src/label/model";
import { LabelRepository } from "../../src/label/provider";

export class FakeLabelRepository implements LabelRepository {
  readonly labels: Label[] = [];

  async create(label: Label): Promise<Label> {
    this.labels.push(label);
    return label;
  }

  async findById(id: string): Promise<Label | null> {
    return this.labels.find((label) => label.id === id) ?? null;
  }

  async findAllByBoardId(boardId: string): Promise<Label[]> {
    return this.labels.filter((label) => label.boardId === boardId);
  }

  async update(label: Label): Promise<Label> {
    const index = this.labels.findIndex((item) => item.id === label.id);
    if (index >= 0) {
      this.labels[index] = label;
    }
    return label;
  }

  async delete(id: string): Promise<void> {
    const index = this.labels.findIndex((label) => label.id === id);
    if (index >= 0) {
      this.labels.splice(index, 1);
    }
  }
}
