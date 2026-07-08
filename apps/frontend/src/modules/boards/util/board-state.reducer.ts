import type { BoardState, CardState, ListState } from '@/modules/boards/types/board-state.type';
import type {
  BoardUpdatedPayload,
  CardDeletedPayload,
  CardEventPayload,
  CardMovedPayload,
  LabelDeletedPayload,
  LabelEventPayload,
  ListDeletedPayload,
  ListEventPayload,
  ListMovedPayload,
} from '@/hooks/use-board-socket';

/**
 * Funções puras de reconciliação de estado do quadro. Cada uma é idempotente: reaplicar
 * o mesmo evento (originado localmente de forma otimista, ou de volta pelo socket) nunca
 * duplica cartões/listas nem produz um estado inconsistente.
 */

/**
 * Reconcilia `board.updated` (`020`): nome e cor do quadro são atualizados ao vivo para
 * qualquer cliente com o quadro aberto, sem recarregar a página.
 */
export function applyBoardUpdated(state: BoardState, payload: BoardUpdatedPayload): BoardState {
  return { ...state, name: payload.board.name, color: payload.board.color };
}

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

export function applyLabelCreated(state: BoardState, payload: LabelEventPayload): BoardState {
  const alreadyExists = state.labels.some((label) => label.id === payload.label.id);
  if (alreadyExists) return state;

  return { ...state, labels: [...state.labels, payload.label] };
}

export function applyLabelUpdated(state: BoardState, payload: LabelEventPayload): BoardState {
  return {
    ...state,
    labels: state.labels.map((label) => (label.id === payload.label.id ? payload.label : label)),
  };
}

export function applyLabelDeleted(state: BoardState, payload: LabelDeletedPayload): BoardState {
  return {
    ...state,
    labels: state.labels.filter((label) => label.id !== payload.labelId),
    lists: state.lists.map((list) => ({
      ...list,
      cards: list.cards.map((card) => ({
        ...card,
        labels: card.labels.filter((label) => label.id !== payload.labelId),
      })),
    })),
  };
}

export function applyCommentCreated(
  state: BoardState,
  payload: { comment: { cardId: string } },
): BoardState {
  const { cardId } = payload.comment;

  return {
    ...state,
    commentsCountByCardId: {
      ...state.commentsCountByCardId,
      [cardId]: (state.commentsCountByCardId[cardId] ?? 0) + 1,
    },
  };
}

export function applyCommentDeleted(
  state: BoardState,
  payload: { commentId: string; cardId: string },
): BoardState {
  const current = state.commentsCountByCardId[payload.cardId] ?? 0;

  return {
    ...state,
    commentsCountByCardId: {
      ...state.commentsCountByCardId,
      [payload.cardId]: Math.max(0, current - 1),
    },
  };
}

function toCardState(card: CardEventPayload['card']): CardState {
  return {
    id: card.id,
    listId: card.listId,
    title: card.title,
    description: card.description,
    position: card.position,
    labels: card.labels,
    dueDate: card.dueDate,
    assignees: card.assignees,
    checklist: card.checklist,
    cover: card.cover,
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
