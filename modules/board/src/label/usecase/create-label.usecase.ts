import {
  DomainError,
  InRule,
  MaxLengthRule,
  MinLengthRule,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { Label, LABEL_COLORS, LabelColor } from "../model";
import { LabelRepository } from "../provider";
import { MembershipRepository } from "../../membership/provider";

export interface CreateLabelIn {
  boardId: string;
  requesterId: string;
  name: string;
  color: LabelColor;
}

export interface CreateLabelOut {
  label: Label;
}

export class CreateLabel implements UseCase<CreateLabelIn, CreateLabelOut> {
  constructor(
    private readonly labelRepository: LabelRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: CreateLabelIn): Promise<CreateLabelOut> {
    Validator.validate([
      {
        code: "createLabel.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "createLabel.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "createLabel.name",
        value: input.name,
        rules: [new RequiredRule(), new MinLengthRule(1), new MaxLengthRule(60)],
      },
      {
        code: "createLabel.color",
        value: input.color,
        rules: [new RequiredRule(), new InRule(LABEL_COLORS)],
      },
    ]);

    const membership = await this.membershipRepository.findByBoardAndUser(
      input.boardId,
      input.requesterId,
    );

    if (!membership) {
      throw new DomainError("board.member.required", 403);
    }

    const label = new Label({
      boardId: input.boardId,
      name: input.name,
      color: input.color,
    });
    label.validate();

    const created = await this.labelRepository.create(label);

    return { label: created };
  }
}
