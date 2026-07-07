import {
  DomainError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import type { BoardRepository, MembershipRepository } from "@taskboard/board";
import { UserRepository } from "../provider";

export interface DeleteAccountIn {
  userId: string;
}

/**
 * Regra de exclusao de conta (021-config-conta, ver design.md):
 * 1. Separa as memberships do usuario entre owner e nao-owner.
 * 2. Se qualquer quadro-owner tiver outros membros, bloqueia a exclusao inteira
 *    (`account.delete.owner.boards.blocked`, 409) - nada e excluido.
 * 3. Sem bloqueio: exclui os quadros-owner "solo" (cascata via BoardRepository.delete,
 *    que ja remove listas/cartoes/etiquetas/atividades/memberships desse quadro).
 * 4. Remove as memberships em quadros de terceiros (o usuario "sai" desses quadros).
 * 5. Exclui o proprio User.
 *
 * Nenhum metodo novo de porta foi necessario em BoardRepository/MembershipRepository -
 * listBoardsByUser/listByBoardId/delete ja cobrem toda a regra (decisao registrada na
 * evidencia da task 1.3, simplificando o design inicial).
 */
export class DeleteAccount implements UseCase<DeleteAccountIn, void> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly boardRepository: BoardRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(input: DeleteAccountIn): Promise<void> {
    Validator.validate([
      {
        code: "deleteAccount.userId",
        value: input.userId,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);

    const memberships = await this.membershipRepository.listBoardsByUser(
      input.userId,
    );
    const ownerMemberships = memberships.filter((m) => m.role === "owner");
    const otherMemberships = memberships.filter((m) => m.role !== "owner");

    for (const membership of ownerMemberships) {
      const boardMembers = await this.membershipRepository.listByBoardId(
        membership.boardId,
      );
      const hasOthers = boardMembers.some((m) => m.userId !== input.userId);
      if (hasOthers) {
        throw new DomainError("account.delete.owner.boards.blocked", 409);
      }
    }

    for (const membership of ownerMemberships) {
      await this.boardRepository.delete(membership.boardId);
    }

    for (const membership of otherMemberships) {
      await this.membershipRepository.delete(membership.boardId, input.userId);
    }

    await this.userRepository.delete(input.userId);
  }
}
