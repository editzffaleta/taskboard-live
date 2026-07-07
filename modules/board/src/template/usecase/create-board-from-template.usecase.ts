import {
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { Board } from "../../board/model";
import { BoardRepository } from "../../board/provider";
import { BoardTemplate } from "../board-template.types";

export interface CreateBoardFromTemplateIn {
  templateId: string;
  name?: string;
  ownerId: string;
}

export interface CreateBoardFromTemplateOut {
  board: Board;
}

export class CreateBoardFromTemplate
  implements UseCase<CreateBoardFromTemplateIn, CreateBoardFromTemplateOut>
{
  constructor(
    private readonly boardRepository: BoardRepository,
    private readonly templates: BoardTemplate[],
  ) {}

  async execute(
    input: CreateBoardFromTemplateIn,
  ): Promise<CreateBoardFromTemplateOut> {
    Validator.validate([
      {
        code: "createBoardFromTemplate.templateId",
        value: input.templateId,
        rules: [new RequiredRule()],
      },
      {
        code: "createBoardFromTemplate.ownerId",
        value: input.ownerId,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);

    const template = this.templates.find(
      (candidate) => candidate.id === input.templateId,
    );

    if (!template) {
      throw new NotFoundError("boardTemplate.not.found");
    }

    const { board } = await this.boardRepository.createFromTemplate({
      name: input.name || template.name,
      ownerId: input.ownerId,
      lists: template.lists,
    });

    return { board };
  }
}
