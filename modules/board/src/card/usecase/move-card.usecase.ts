import {
  DomainError,
  IntegerRule,
  MinValueRule,
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { Card } from "../model";
import { CardRepository } from "../provider";
import { ListRepository } from "../../list/provider";
import { MembershipRepository } from "../../membership/provider";

export interface MoveCardIn {
  boardId: string;
  cardId: string;
  requesterId: string;
  toListId: string;
  position: number;
}

export interface MoveCardOut {
  card: Card;
  fromListId: string;
  toListId: string;
  position: number;
}

export class MoveCard implements UseCase<MoveCardIn, MoveCardOut> {
  constructor(
    private readonly cardRepository: CardRepository,
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: MoveCardIn): Promise<MoveCardOut> {
    Validator.validate([
      {
        code: "moveCard.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "moveCard.cardId",
        value: input.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "moveCard.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "moveCard.toListId",
        value: input.toListId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "moveCard.position",
        value: input.position,
        rules: [new RequiredRule(), new IntegerRule(), new MinValueRule(0)],
      },
    ]);

    const card = await this.cardRepository.findById(input.cardId);

    if (!card) {
      throw new NotFoundError("card.not.found");
    }

    const fromList = await this.listRepository.findById(card.listId);

    if (!fromList || fromList.boardId !== input.boardId) {
      throw new NotFoundError("card.not.found");
    }

    const membership = await this.membershipRepository.findByBoardAndUser(
      input.boardId,
      input.requesterId,
    );

    if (!membership) {
      throw new DomainError("board.member.required", 403);
    }

    const toList = await this.listRepository.findById(input.toListId);

    if (!toList || toList.boardId !== input.boardId) {
      throw new NotFoundError("list.not.found");
    }

    const fromListId = card.listId;
    const toListId = input.toListId;

    if (fromListId === toListId) {
      const moved = await this.reorderWithinList(card, toListId, input.position);
      return {
        card: moved,
        fromListId,
        toListId,
        position: moved.position,
      };
    }

    const moved = await this.moveAcrossLists(card, toListId, input.position);

    return {
      card: moved,
      fromListId,
      toListId,
      position: moved.position,
    };
  }

  private async reorderWithinList(
    card: Card,
    listId: string,
    position: number,
  ): Promise<Card> {
    const listCards = (
      await this.cardRepository.findAllByListId(listId)
    ).sort((a, b) => a.position - b.position);

    const withoutMoved = listCards.filter((item) => item.id !== card.id);

    const clampedPosition = Math.min(
      Math.max(position, 0),
      withoutMoved.length,
    );

    const reordered = [
      ...withoutMoved.slice(0, clampedPosition),
      card,
      ...withoutMoved.slice(clampedPosition),
    ];

    const renormalized = reordered.map((item, index) =>
      item.position === index ? item : item.clone({ position: index }),
    );

    renormalized.forEach((item) => item.validate());

    await this.cardRepository.updatePositions(
      renormalized.map((item) => ({
        id: item.id,
        listId: item.listId,
        position: item.position,
      })),
    );

    return renormalized.find((item) => item.id === card.id) ?? card;
  }

  private async moveAcrossLists(
    card: Card,
    toListId: string,
    position: number,
  ): Promise<Card> {
    const fromListId = card.listId;

    const originCards = (
      await this.cardRepository.findAllByListId(fromListId)
    )
      .filter((item) => item.id !== card.id)
      .sort((a, b) => a.position - b.position);

    const renormalizedOrigin = originCards.map((item, index) =>
      item.position === index ? item : item.clone({ position: index }),
    );

    const destinationCards = (
      await this.cardRepository.findAllByListId(toListId)
    ).sort((a, b) => a.position - b.position);

    const clampedPosition = Math.min(
      Math.max(position, 0),
      destinationCards.length,
    );

    const movedCard = card.clone({
      listId: toListId,
      position: clampedPosition,
    });

    const destinationReordered = [
      ...destinationCards.slice(0, clampedPosition),
      movedCard,
      ...destinationCards.slice(clampedPosition),
    ];

    const renormalizedDestination = destinationReordered.map((item, index) =>
      item.position === index ? item : item.clone({ position: index }),
    );

    [...renormalizedOrigin, ...renormalizedDestination].forEach((item) =>
      item.validate(),
    );

    await this.cardRepository.updatePositions([
      ...renormalizedOrigin.map((item) => ({
        id: item.id,
        listId: item.listId,
        position: item.position,
      })),
      ...renormalizedDestination.map((item) => ({
        id: item.id,
        listId: item.listId,
        position: item.position,
      })),
    ]);

    return (
      renormalizedDestination.find((item) => item.id === card.id) ?? movedCard
    );
  }
}
