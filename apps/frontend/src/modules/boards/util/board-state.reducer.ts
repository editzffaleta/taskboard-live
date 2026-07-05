import type { BoardState, CardState, ListState } from '@/modules/boards/types/board-state.type';
import type {
  CardDeletedPayload,
  CardEventPayload,
  CardMovedPayload,
  ListDeletedPayload,
  ListEventPayload,
  ListMovedPayload,
} from '@/hooks/use-board-socket';

/**
 * Funções puras de reconciliação de estado do quadro. Cada uma é idempotente: reaplicar
 * o mesmo evento (originado localmente de forma otimista, ou de volta pelo socket) nunca
 * duplica cartões/listas nem produz um estado inconsistente.
 */

export function applyCardCreated(state: BoardState, payload: CardEventPayload): BoardState {
  const { card } = payload;

  const alreadyExists = state.lists.some((list) => list.cards.some((existing) => existing.id === card.id));
  if (alreadyExists) return state;

  return {
    ...state,
    lists: state.lists.map((list) =>
      list.id === card.listId
        ? { ...list, cards: [...list.cards, toCardState(card)] }
        : list,
    ),
  };
}

export function applyCardUpdated(state: BoardState, payload: CardEventPayload): BoardState {
  const { card } = payload;

  return {
    ...state,
    lists: state.lists.map((list) => ({
      ...list,
      cards: list.cards.map((existing) => (existing.id === card.id ? toCardState(card) : existing)),
    })),
  };
}

export function applyCardMoved(state: BoardState, payload: CardMovedPayload): BoardState {
  const { cardId, toListId, position } = payload;

  let movingCard: CardState | undefined;
  const listsWithoutCard = state.lists.map((list) => {
    const found = list.cards.find((card) => card.id === cardId);
    if (found) movingCard = found;

    return { ...list, cards: list.cards.filter((card) => card.id !== cardId) };
  });

  if (!movingCard) return state;

  const updatedCard: CardState = { ...movingCard, listId: toListId, position };

  return {
    ...state,
    lists: listsWithoutCard.map((list) => {
      if (list.id !== toListId) return list;

      const cards = [...list.cards];
      const insertIndex = Math.min(Math.max(position, 0), cards.length);
      cards.splice(insertIndex, 0, updatedCard);

      return {
        ...list,
        cards: cards.map((card, index) => ({ ...card, position: index })),
      };
    }),
  };
}

export function applyCardDeleted(state: BoardState, payload: CardDeletedPayload): BoardState {
  return {
    ...state,
    lists: state.lists.map((list) => ({
      ...list,
      cards: list.cards.filter((card) => card.id !== payload.cardId),
    })),
  };
}

export function applyListCreated(state: BoardState, payload: ListEventPayload): BoardState {
  const alreadyExists = state.lists.some((list) => list.id === payload.id);
  if (alreadyExists) return state;

  return {
    ...state,
    lists: [...state.lists, toListState(payload)],
  };
}

export function applyListUpdated(state: BoardState, payload: ListEventPayload): BoardState {
  return {
    ...state,
    lists: state.lists.map((list) =>
      list.id === payload.id ? { ...list, title: payload.title, position: payload.position } : list,
    ),
  };
}

export function applyListMoved(state: BoardState, payload: ListMovedPayload): BoardState {
  const positionById = new Map(payload.lists.map((list) => [list.id, list.position]));

  const updatedLists = state.lists.map((list) =>
    positionById.has(list.id) ? { ...list, position: positionById.get(list.id)! } : list,
  );

  return {
    ...state,
    lists: [...updatedLists].sort((a, b) => a.position - b.position),
  };
}

export function applyListDeleted(state: BoardState, payload: ListDeletedPayload): BoardState {
  return {
    ...state,
    lists: state.lists.filter((list) => list.id !== payload.listId),
  };
}

function toCardState(card: CardEventPayload['card']): CardState {
  return {
    id: card.id,
    listId: card.listId,
    title: card.title,
    description: card.description,
    position: card.position,
  };
}

function toListState(list: ListEventPayload): ListState {
  return {
    id: list.id,
    title: list.title,
    position: list.position,
    cards: [],
  };
}
