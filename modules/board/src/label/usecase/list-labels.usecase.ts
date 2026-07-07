import {
  DomainError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { Label } from "../model";
import { LabelRepository } from "../provider";
import { MembershipRepository } from "../../membership/provider";

export interface ListLabelsIn {
  boardId: string;
  requesterId: string;
}

export interface ListLabelsOut {
  labels: Label[];
}

export class ListLabels implements UseCase<ListLabelsIn, ListLabelsOut> {
  constructor(
    private readonly labelRepository: LabelRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: ListLabelsIn): Promise<ListLabelsOut> {
    Validator.validate([
      {
        code: "listLabels.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "listLabels.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);

    const membership = await this.membershipRepository.findByBoardAndUser(
      input.boardId,
      input.requesterId,
    );

    if (!membership) {
      throw new DomainError("board.member.required", 403);
    }

    const labels = await this.labelRepository.findAllByBoardId(input.boardId);
    const sorted = [...labels].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    return { labels: sorted };
  }
}
