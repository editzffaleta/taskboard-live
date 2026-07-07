import {
  DomainError,
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { LabelRepository } from "../provider";
import { MembershipRepository } from "../../membership/provider";

export interface DeleteLabelIn {
  boardId: string;
  labelId: string;
  requesterId: string;
}

export interface DeleteLabelOut {
  labelId: string;
}

export class DeleteLabel implements UseCase<DeleteLabelIn, DeleteLabelOut> {
  constructor(
    private readonly labelRepository: LabelRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: DeleteLabelIn): Promise<DeleteLabelOut> {
    Validator.validate([
      {
        code: "deleteLabel.boardId",
        value: input.boardId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "deleteLabel.labelId",
        value: input.labelId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "deleteLabel.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
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

    await this.labelRepository.delete(input.labelId);

    return { labelId: input.labelId };
  }
}
