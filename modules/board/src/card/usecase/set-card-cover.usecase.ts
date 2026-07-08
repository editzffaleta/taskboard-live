import {
  DomainError,
  InRule,
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
import { LABEL_COLORS, LabelColor } from "../../label/model";

export interface SetCardCoverIn {
  boardId: string;
  cardId: string;
  requesterId: string;
  cover: LabelColor | null;
}

export interface SetCardCoverOut {
  card: Card;
}

export class SetCardCover implements UseCase<SetCardCoverIn, SetCardCoverOut> {
  constructor(
    private readonly cardRepository: CardRepository,
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: SetCardCoverIn): Promise<SetCardCoverOut> {
    Validator.validate([
      {
        code: "setCardCover.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "setCardCover.cardId",
        value: input.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "setCardCover.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "setCardCover.cover",
        value: input.cover,
        rules: input.cover === null ? [] : [new InRule(LABEL_COLORS)],
      },
    ]);

    const card = await this.cardRepository.findById(input.cardId);

    if (!card) {
      throw new NotFoundError("card.not.found");
    }

    const list = await this.listRepository.findById(card.listId);

    if (!list || list.boardId !== input.boardId) {
      throw new NotFoundError("card.not.found");
    }

    const membership = await this.membershipRepository.findByBoardAndUser(
      list.boardId,
      input.requesterId,
    );

    if (!membership) {
      throw new DomainError("board.member.required", 403);
    }

    const edited = card.clone({ cover: input.cover });
    edited.validate();

    const updated = await this.cardRepository.update(edited);

    return { card: updated };
  }
}
