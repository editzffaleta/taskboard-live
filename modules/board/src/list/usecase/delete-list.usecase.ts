import {
  DomainError,
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { ListRepository } from "../provider";
import { MembershipRepository } from "../../membership/provider";

export interface DeleteListIn {
  listId: string;
  requesterId: string;
}

export interface DeleteListOut {
  boardId: string;
  listId: string;
}

export class DeleteList implements UseCase<DeleteListIn, DeleteListOut> {
  constructor(
    private readonly listRepository: ListRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: DeleteListIn): Promise<DeleteListOut> {
    Validator.validate([
      {
        code: "deleteList.listId",
        value: input.listId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "deleteList.requesterId",
        value: input.requesterId,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);

    const list = await this.listRepository.findById(input.listId);

    if (!list) {
      throw new NotFoundError("list.not.found");
    }

    const membership = await this.membershipRepository.findByBoardAndUser(
      list.boardId,
      input.requesterId,
    );

    if (!membership) {
      throw new DomainError("board.member.required", 403);
    }

    // A exclusao dos cartoes da lista e responsabilidade da constraint de FK
    // (`onDelete: Cascade` de `Card.listId`, definida pela change 008) — nao
    // e feita aqui.
    await this.listRepository.delete(input.listId);

    return { boardId: list.boardId, listId: list.id };
  }
}
