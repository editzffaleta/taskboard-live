> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `005` (módulo `board`, `BoardMember`), `006` (`RealtimeEmitter`).
> **Não faça:** cartões (`008`); componentes de frontend/UI ao vivo (`009`); registro de
> atividade/auditoria (`011`); reimplementar checagem de membership do zero — reutilize a da
> `005`. **Princípio:** o emit de tempo real acontece no controller, após o caso de uso ter
> sucesso — nunca dentro do caso de uso.

## 1. Domínio e aplicação

- [ ] 1.1 Criar a entidade `List` (`domain/list.entity.ts`) com `id`, `boardId`, `title`,
  `position`, `createdAt`; sem imports de infraestrutura. Skill:
  [module-entity](../../../.claude/skills/module-entity).
  - **Pré:** módulo `board` da `005` já existe com a pasta `domain/`.
  - **Aceite:** entidade compila isolada; `title` vazio é rejeitado no construtor/factory.
  - **Não faça:** adicionar campos de `card` ou de atividade à entidade.
- [ ] 1.2 Criar a porta `ListRepository` (`application/ports/list-repository.port.ts`) com
  `create`, `findById`, `findAllByBoardId` (ordenado por `position`), `update`,
  `updatePositions` (batch) e `delete`. Skill:
  [module-repository](../../../.claude/skills/module-repository).
  - **Pré:** entidade `List` da task 1.1 concluída.
  - **Aceite:** a porta é uma interface pura (sem tipos do Prisma); todos os métodos usados pelos
    casos de uso da task 1.3 estão declarados.
- [ ] 1.3 Implementar os quatro casos de uso (`application/use-cases/`): `create-list.use-case.ts`
  (`position` no fim), `rename-list.use-case.ts`, `delete-list.use-case.ts`,
  `move-list.use-case.ts` (renormaliza `position` das listas do quadro). Todos recebem
  `ListRepository` e reutilizam a checagem de membership já existente do módulo `board` (`005`).
  Skill: [module-use-case](../../../.claude/skills/module-use-case).
  - **Pré:** tasks 1.1 e 1.2 concluídas; mecanismo de checagem de membership da `005` localizado
    e reaproveitado (não reescrito).
  - **Aceite:** cada caso de uso lança erro de domínio 403 quando `requesterId` não é membro do
    quadro, e erro 404 quando `listId`/`boardId` não existe; `move-list` nunca produz posições
    duplicadas ou com lacunas após renormalizar.
  - **Não faça:** chamar `RealtimeEmitter` a partir de dentro dos casos de uso.
- [ ] 1.4 Testes unitários dos quatro casos de uso usando fakes de `ListRepository` (sem Prisma
  real): cenários de sucesso, membro inválido (403) e recurso inexistente (404); `move-list`
  cobre reordenação com renormalização.
  - **Pré:** task 1.3 concluída.
  - **Aceite:** suite roda com `npm test` e cobre os cenários listados; nenhum teste depende de
    banco real.

## 2. Persistência Prisma

- [ ] 2.1 Adicionar o model `List` ao `schema.prisma` modular do módulo `board`, com FK `boardId`
  (`onDelete: Cascade`) para `Board`, `title`, `position`, `createdAt`; rodar
  `npx prisma migrate dev --name add-list`. Se o model `Card` ainda não existir no schema (a
  `008` o cria), **não** declare `cards Card[]` no model `List` nesta change. Skill:
  [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module).
  - **Pré:** módulo `board` já tem schema modular desde a `005`.
  - **Aceite:** migration aplicada sem erro; `List` aparece no client Prisma gerado; FK
    `boardId → Board.id` com `onDelete: Cascade` confirmada no schema.
  - **Não faça:** criar o model `Card` ou qualquer campo relativo a cartões.
- [ ] 2.2 Implementar `infrastructure/prisma/list.repository.ts` cumprindo a porta
  `ListRepository` (task 1.2), sem vazar tipos do Prisma para os casos de uso. Skill:
  [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository).
  - **Pré:** task 2.1 concluída (model `List` existe no client Prisma).
  - **Aceite:** todos os métodos da porta implementados; `findAllByBoardId` retorna ordenado por
    `position`; `updatePositions` executa em uma única transação Prisma.

## 3. Interface HTTP e tempo real

- [ ] 3.1 Criar `interface/http/list.controller.ts` expondo `POST /boards/:boardId/lists`,
  `PATCH /lists/:id`, `DELETE /lists/:id`, `PATCH /lists/:id/move` (`{ position }`), todos
  autenticados (guard JWT global da `004`) e protegidos pela checagem de membership do quadro
  (reaproveitada da `005`). Registrar o controller no `BoardModule`. Skill:
  [backend-nest-controller](../../../.claude/skills/backend-nest-controller).
  - **Pré:** casos de uso da task 1.3 e repositório da task 2.2 concluídos.
  - **Aceite:** as quatro rotas respondem conforme o contrato; requisição de não-membro retorna
    403; `boardId` de `PATCH`/`DELETE`/`move` é resolvido a partir da lista carregada, não da URL.
  - **Não faça:** aceitar `position` livre em `POST` (a posição é sempre calculada no fim).
- [ ] 3.2 Após cada caso de uso ter sucesso, chamar `RealtimeEmitter.emitToBoard(boardId, event,
  payload)` no controller: `list.created`, `list.updated`, `list.moved` (com as listas
  reordenadas), `list.deleted` (com `{ listId }`), para a sala `board:{boardId}`.
  - **Pré:** task 3.1 concluída; `RealtimeEmitter` da `006` injetável no `BoardModule`.
  - **Aceite:** cada mutação bem-sucedida dispara exatamente um evento correspondente; nenhuma
    chamada ao emitter ocorre em caso de erro (403/404) ou dentro do caso de uso.
  - **Não faça:** emitir eventos de `card.*` ou `activity.*` — fora de escopo desta change.
- [ ] 3.3 Mapear no i18n (pt/en) as chaves de erro dos endpoints de `/boards/:boardId/lists` e
  `/lists` (não-membro, não encontrado, título vazio).
  - **Pré:** task 3.1 concluída.
  - **Aceite:** chaves presentes em `messages.pt.ts` e `messages.en.ts`; erros do controller usam
    essas chaves.
- [ ] 3.4 Testes de integração dos endpoints: criação insere no fim, renomeação, exclusão (lista +
  cartões quando existirem via cascade), reordenação sem duplicar/lacunar posições, acesso negado
  para não-membro (403).
  - **Pré:** tasks 3.1 a 3.3 concluídas.
  - **Aceite:** suite roda com `npm test`/`npm run test:e2e` (conforme padrão do projeto) e cobre
    os cenários listados.

## 4. Verificação

- [ ] 4.1 Rodar `npx tsc --noEmit` no backend, `npm test` e validar manualmente: criar quadro
  (via `005`), criar/renomear/mover/excluir listas via HTTP e confirmar recebimento dos eventos
  `list.*` em um cliente Socket.IO de teste conectado à sala `board:{boardId}`.
  - **Pré:** tasks 1 a 3 concluídas.
  - **Aceite:** `tsc` limpo; testes verdes; validação manual dos quatro eventos registrada.
