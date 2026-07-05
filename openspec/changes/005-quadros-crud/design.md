## Context

A base técnica (`001`) e o login/JWT (`004`) já existem: monorepo Turbo, Prisma, pacote
compartilhado, tratamento de erros, `AuthGuard`/`AuthContext` no frontend e `current-user.decorator`
no backend (o JWT carrega `{ sub, name, email }`). O TaskBoard Live não tem organização, tenant nem
papel global — a autorização daqui em diante é sempre por quadro, via `BoardMember`.

Esta mudança cria o módulo de negócio `board`, com dois agregados que nascem juntos porque o
`create-board` os grava na mesma transação:

- **`board`**: `Board { id, name, ownerId, createdAt }`.
- **`membership`**: `BoardMember { id, boardId, userId, role ('owner'|'member'), createdAt }`, com
  `unique(boardId, userId)`.

Nenhuma outra change pode alterar os nomes do modelo canônico acima. `List`, `Card` e `Activity`
(agregados de changes futuras) referenciam `boardId`/`userId` já definidos aqui.

Referências compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Implementar `create-board`, `rename-board`, `delete-board`, `list-my-boards` e `get-board` no
  módulo `board`, com testes unitários cobrindo caminho feliz e erros de domínio.
- Garantir que todo `Board` criado tenha, na mesma transação, um `BoardMember` `role='owner'` para
  o criador.
- Expor `/boards` autenticado, com checagem de membership/ownership no caso de uso ou controller.
- Persistir `Board`/`BoardMember` via Prisma com `unique(boardId, userId)`.
- Entregar o dashboard (`app/(private)`) com listagem, criação e navegação para `/boards/[id]`.

**Non-Goals:**
- Listas (`List`) e cartões (`Card`) — são as changes `007` e `008`.
- Qualquer sincronização em tempo real (Socket.IO) — é a `006`.
- Convidar outros membros para um quadro além do owner — é a `010`.
- A página `/boards/[id]` completa (colunas, cartões, tempo real) — é a `009`; aqui a rota existe
  apenas como placeholder navegável.
- Qualquer papel além de `owner`/`member` — sem hierarquia adicional.

## Decisions

- **Módulo `board` com dois agregados desde o início (`board` + `membership`)**: `create-board`
  precisa gravar ambos atomicamente; separar os agregados evita que `membership` vire um campo
  solto dentro de `board` e prepara o terreno para `010` (convites) reutilizar o mesmo
  `MembershipRepository`.
- **`create-board` cria o `BoardMember` owner na mesma transação**: usar transação do Prisma
  (`prisma.$transaction`) na implementação do repositório, mas a orquestração de "criar board e
  criar membership" acontece no caso de uso, que recebe ambos os repositórios (ou um repositório
  composto/`BoardRepository.createWithOwner`) — decidir no momento da implementação e registrar a
  escolha na evidência da task 1.5. Preferência: método dedicado no repositório de `board`
  (`createWithOwnerMembership`) para manter a atomicidade sem vazar transação Prisma para o domínio.
- **Autorização por membership, não por papel global**: `get-board`/`list-my-boards` verificam
  `BoardMember` existente para o par `(boardId, userId)`; `rename-board`/`delete-board` verificam
  adicionalmente `role === 'owner'`. Falha de membership → `NotFoundError`
  (`board.not.found`, 404) para não vazar a existência do quadro a não-membros; falha de ownership
  em rename/delete → `DomainError('board.owner.required', 403)`.
- **`list-my-boards` filtra por membership do usuário autenticado**: nunca lista todos os quadros
  do sistema — sempre `WHERE BoardMember.userId = <usuário atual>`.
- **Sem exclusão em cascata explícita aqui**: `List`/`Card`/`Activity` ainda não existem neste
  ponto do trilho; a política de cascade ao excluir um `Board` fica a cargo do Prisma
  (`onDelete: Cascade` nas FKs) e será revisitada pelas changes que criarem esses agregados, se
  necessário.
- **Rota `/boards/[id]` como placeholder**: nesta change ela só existe para o link do dashboard
  funcionar; o conteúdo real (colunas ao vivo) é entregue pela `009`.
- **Skills dedicadas como implementação principal**: module-aggregate, module-entity,
  module-repository, module-use-case, backend-prisma-sync-module, backend-prisma-repository,
  backend-nest-controller, frontend-next-config.

## Risks / Trade-offs

- [Atomicidade de criar `Board` + `BoardMember` owner] → Task dedicada implementando via
  `$transaction` no repositório Prisma; teste de integração cobre a criação simultânea de ambos os
  registros.
- [Vazar existência de quadro a não-membros via 403 vs 404] → Decisão: 404 (`board.not.found`) em
  vez de 403 quando o usuário não é membro, para não confirmar a existência do recurso a quem não
  tem acesso.
- [Skill indicada não cobrir o caso inteiro] → Aplicar até onde fizer sentido e registrar o desvio
  na evidência.
