import {
  DomainError,
  InRule,
  MaxLengthRule,
  MinLengthRule,
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { Label, LABEL_COLORS, LabelColor } from "../model";
import { LabelRepository } from "../provider";
import { MembershipRepository } from "../../membership/provider";

export interface UpdateLabelIn {
  boardId: string;
  labelId: string;
  requesterId: string;
  name?: string;
  color?: LabelColor;
}

export interface UpdateLabelOut {
  label: Label;
}

export class UpdateLabel implements UseCase<UpdateLabelIn, UpdateLabelOut> {
  constructor(
    private readonly labelRepository: LabelRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: UpdateLabelIn): Promise<UpdateLabelOut> {
    Validator.validate([
      {
        code: "updateLabel.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "updateLabel.labelId",
        value: input.labelId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "updateLabel.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "updateLabel.name",
        value: input.name,
        rules:
          input.name === undefined
            ? []
            : [new RequiredRule(), new MinLengthRule(1), new MaxLengthRule(60)],
      },
      {
        code: "updateLabel.color",
        value: input.color,
        rules: input.color === undefined ? [] : [new InRule(LABEL_COLORS)],
      },
    ]);

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

    const edited = label.clone({
      name: input.name ?? label.name,
      color: input.color ?? label.color,
    });
    edited.validate();

    const updated = await this.labelRepository.update(edited);

    return { label: updated };
  }
}
