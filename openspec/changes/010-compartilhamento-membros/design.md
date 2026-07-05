## Context

O módulo `board` já existe (`005`) com dois agregados: `board` (`Board { id, name, ownerId,
createdAt }`) e `membership` (`BoardMember { id, boardId, userId, role ('owner'|'member'),
createdAt }`, `unique(boardId, userId)`). Todo `Board` já nasce com um `BoardMember`
`role='owner'` para o criador. O gateway de tempo real (`006`) já expõe a porta
`RealtimeEmitter.emitToBoard(boardId, event, payload)`, registrada como provider exportado do
`BoardModule`, e já define `member.added` no catálogo de eventos (sem emiti-lo ainda). A página
`/boards/[id]` (`009`) já conecta o socket do quadro e trata `presence.update`; esta change
adiciona o painel de membros e o consumo de `member.added` nessa mesma página.

Esta change **não cria nenhum model Prisma novo** — reaproveita `User` (`{ id, name, email }`,
`004`) e `BoardMember` (`005`) tal como estão. É puramente casos de uso + endpoints + UI sobre o
que já existe.

Referências compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Implementar `add-member`, `remove-member`, `list-members` no módulo `board`, reutilizando os
  repositórios de `membership` (e `UserRepository`/equivalente para resolver e-mail → `User`)
  já disponíveis desde `004`/`005`.
- Expor `/boards/:boardId/members` (`GET`, `POST`, `DELETE /:userId`) autenticado, com
  autorização por `role` verificada a partir do `BoardMember` do usuário atual.
- Emitir `member.added` via `RealtimeEmitter` após `add-member` ter sucesso.
- Entregar o painel "Compartilhar" na página do quadro (`009`), com visibilidade condicional dos
  controles de gestão ao papel do usuário atual.

**Non-Goals:**
- Convite por e-mail transacional (envio de e-mail, token de convite, aceite assíncrono) — fora
  de escopo; o membro é adicionado diretamente se a conta já existir.
- Qualquer papel além de `owner`/`member` — sem hierarquia adicional (ex.: "admin").
- Alterar o modelo Prisma de `Board`/`BoardMember` — já fechado na `005`.
- Remover o próprio quadro por perda do último owner, transferência de ownership, ou qualquer
  fluxo de "sair do quadro" — fora de escopo desta change.

## Decisions

- **Localização dos casos de uso**: `apps/backend/src/modules/board/application/use-cases/`
  (mesma pasta dos casos de uso de `005`) — `add-member.use-case.ts`,
  `remove-member.use-case.ts`, `list-members.use-case.ts`. Cada um recebe os repositórios via
  construtor (portas), nunca Prisma concreto, seguindo a skill
  [module-use-case](../../../.claude/skills/module-use-case).
- **Resolução de e-mail → `User`**: `add-member` recebe `email` (string) e usa o
  `UserRepository` (ou porta equivalente já existente desde `004`) para localizar o `User` pelo
  e-mail. Não encontrado → `DomainError('board.member.not.found', 404)`. Encontrado mas já é
  `BoardMember` do quadro (`unique(boardId, userId)` violado) → `DomainError`
  (`board.member.already.exists`, 409), verificado antes do insert para retornar erro de domínio
  em vez de deixar estourar a constraint do banco.
- **Autorização por role, não por dono do recurso HTTP**: `add-member`/`remove-member`
  verificam que o usuário autenticado é `BoardMember` do quadro com `role === 'owner'` antes de
  qualquer efeito — falha → `DomainError('board.owner.required', 403)`. `list-members` verifica
  apenas que o usuário é `BoardMember` (qualquer role) do quadro — falha → `DomainError`
  (`board.not.found`, 404), mesmo padrão de não vazar existência do quadro usado na `005`.
- **`remove-member` não remove o owner**: antes de remover, verifica se o `userId` alvo é o
  `ownerId` do `Board` (ou tem `role === 'owner'` no `BoardMember` alvo); se for, retorna
  `DomainError('board.owner.cannot.be.removed', 403)`. Não há fluxo de transferência de
  ownership nesta change.
- **Endpoints no `BoardController` existente ou controller dedicado**: `GET /boards/:boardId/
  members`, `POST /boards/:boardId/members` (`{ email }`), `DELETE
  /boards/:boardId/members/:userId`, usando a skill
  [backend-nest-controller](../../../.claude/skills/backend-nest-controller). Se o
  `BoardController` da `005` já existir no mesmo arquivo, adicionar os métodos ali; caso o
  arquivo esteja grande, criar `members.controller.ts` no mesmo módulo — decisão de
  implementação, registrar na evidência da task 1.4.
- **Emissão de `member.added` após sucesso do caso de uso**: o controller (ou o próprio caso de
  uso, se preferir manter o efeito colateral fora do controller) injeta `RealtimeEmitter` e
  chama `emitToBoard(boardId, 'member.added', { boardId, user: { id, name, email }, role:
  'member' })` **somente depois** que `add-member` retornar com sucesso — nunca antes, para não
  notificar uma adição que falhou. Seguir o mesmo padrão de injeção de `RealtimeEmitter` já
  descrito no `design.md` da `006`.
- **Painel "Compartilhar" no frontend**: componente novo em
  `apps/frontend/app/(private)/boards/[id]/` (ou `shared/` se for reutilizável), usando a skill
  [frontend-next-config](../../../.claude/skills/frontend-next-config) para o consumo dos
  endpoints. Lista os membros via `GET`, formulário de e-mail com `POST` (com feedback de erro
  para os casos `board.member.not.found`/`board.member.already.exists`), botão de remover por
  membro com `DELETE`. Os controles de convidar/remover só renderizam se o usuário atual é
  `owner` do quadro (dado já disponível na página do quadro desde a `009`, ou obtido junto do
  `GET /boards/:boardId` existente). O componente escuta `member.added` no socket já conectado
  pela `009` e atualiza a lista de membros localmente, sem novo fetch.

## Risks / Trade-offs

- [Race entre `add-member` e a checagem de e-mail já existente] → Verificar
  `unique(boardId, userId)` antes do insert e tratar a violação de constraint como fallback
  defensivo (retornar `board.member.already.exists` também se o insert falhar por constraint),
  documentando na evidência da task de teste.
- [`remove-member` do owner por engano] → Checagem explícita de `role === 'owner'` do alvo antes
  de qualquer delete, com teste dedicado cobrindo a tentativa de remover o owner.
- [Painel de membros divergir do estado do socket em caso de falha de conexão] → Fonte de
  verdade continua sendo o `GET /boards/:boardId/members` no mount; o evento `member.added`
  apenas atualiza incrementalmente enquanto conectado, sem substituir o fetch inicial.
