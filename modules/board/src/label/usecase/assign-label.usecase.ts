import {
  DomainError,
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { Label } from "../model";
import { CardLabelRepository, LabelRepository } from "../provider";
import { Card } from "../../card/model";
import { CardRepository } from "../../card/provider";
import { ListRepository } from "../../list/provider";
import { MembershipRepository } from "../../membership/provider";

export interface AssignLabelIn {
  boardId: string;
  cardId: string;
  labelId: string;
  requesterId: string;
}

export interface AssignLabelOut {
  card: Card;
  labels: Label[];
}

export class AssignLabel implements UseCase<AssignLabelIn, AssignLabelOut> {
  constructor(
    private readonly cardLabelRepository: CardLabelRepository,
    private readonly labelRepository: LabelRepository,
    private readonly cardRepository: CardRepository,
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: AssignLabelIn): Promise<AssignLabelOut> {
    Validator.validate([
      {
        code: "assignLabel.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "assignLabel.cardId",
        value: input.cardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "assignLabel.labelId",
        value: input.labelId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "assignLabel.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
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

    const label = await this.labelRepository.findById(input.labelId);

    if (!label || label.boardId !== input.boardId) {
      throw new NotFoundError("label.not.found");
    }

    const membership = await this.membershipRepository.findByBoardAndUser(
      input.boardId,
      input.requesterId,
    );

    if (!membership) {
      throw new DomainError("board.member.required", 403);
    }

    await this.cardLabelRepository.assign(card.id, label.id);

    const labels = await this.hydrateLabels(card.id);

    return { card, labels };
  }

  private async hydrateLabels(cardId: string): Promise<Label[]> {
    const labelIds = await this.cardLabelRepository.findAllByCardId(cardId);
    const labels = await Promise.all(
      labelIds.map((labelId) => this.labelRepository.findById(labelId)),
    );

    return labels.filter((label): label is Label => label !== null);
  }
}
