import { ChecklistItem } from "../model";

export interface ChecklistItemRepository {
  create(item: ChecklistItem): Promise<ChecklistItem>;
  findById(id: string): Promise<ChecklistItem | null>;
  findAllByCardId(cardId: string): Promise<ChecklistItem[]>;
  /**
   * Hidrata `checklist` de varios cartoes numa unica consulta (evita N+1).
   * Retorna um mapa cardId -> itens.
   */
  findAllByCardIds(cardIds: string[]): Promise<Record<string, ChecklistItem[]>>;
  update(item: ChecklistItem): Promise<ChecklistItem>;
  delete(id: string): Promise<void>;
}
