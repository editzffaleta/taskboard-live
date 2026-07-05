> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `007` (agregado `list`), `006` (`RealtimeEmitter` registrada e exportada
> pelo `BoardModule`). **Não faça:** UI de drag-and-drop ou renderização de cartões (`009`);
> registro de atividade/auditoria (`011`); reimplementar sala/presença/handshake do Socket.IO
> (já existe na `006`). **Princípio:** cada mutação só emite o evento de tempo real **após** o
> caso de uso ter sucesso — nunca antes, nunca em caso de erro.

## 1. Domínio e aplicação

- [ ] 1.1 Criar a entidade `Card` (`id`, `listId`, `title`, `description` opcional, `position`,
  `createdAt`) e a porta `CardRepository` no agregado `card` do módulo `board`, seguindo a skill
  [module-aggregate](../../../.claude/skills/module-aggregate) e
  [module-entity](../../../.claude/skills/module-entity).
  - **Pré:** agregado `list` da `007` já existe com sua própria entidade/repositório.
  - **Aceite:** `Card` compila; `CardRepository` é uma interface sem dependência de Prisma;
    testes unitários da entidade cobrem criação válida e validação de `title` obrigatório.
  - **Não faça:** importar Prisma dentro de `domain`.
- [ ] 1.2 Implementar `create-card`, `edit-card`, `delete-card` e `move-card` como casos de uso,
  recebendo `CardRepository` e `ListRepository` por porta, seguindo a skill
  [module-use-case](../../../.claude/skills/module-use-case).
  - **Pré:** 1.1 concluída.
  - **Aceite:** `create-card` atribui `position` no fim da lista; `delete-card` renormaliza as
    posições remanescentes da lista; `move-card` cobre os dois casos (mesma lista e lista
    diferente) e renormaliza origem e destino; todos têm testes unitários com fakes em memória
    (sem banco).
  - **Não faça:** deixar buracos na sequência de `position` após qualquer mutação.
- [ ] 1.3 Implementar o repositório de listas usado por `move-card`/`create-card` para validar
  que `listId`/`toListId` pertence ao quadro esperado, seguindo a skill
  [module-repository](../../../.claude/skills/module-repository).
  - **Pré:** repositório de `list` da `007` disponível para consulta.
  - **Aceite:** caso de uso rejeita `listId` de outro quadro com erro de domínio explícito
    (não silencioso).

## 2. Persistência Prisma

- [ ] 2.1 Adicionar o model `Card` ao schema Prisma (`listId` FK → `List`, `title`,
  `description` nullable, `position` int, `createdAt`) e gerar a migration, seguindo a skill
  [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module).
  - **Pré:** model `List` da `007` já existe no schema.
  - **Aceite:** migration aplica sem erro; `npx prisma generate` roda limpo; FK `listId`
    configurada com `onDelete: Cascade` (cartão morre com a lista).
- [ ] 2.2 Implementar `CardPrismaRepository` cumprindo a porta `CardRepository`, seguindo a skill
  [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository).
  - **Pré:** 1.1 e 2.1 concluídas.
  - **Aceite:** todos os métodos da porta implementados; testes de integração com banco de
    teste cobrem criar, editar, excluir e mover (incluindo troca de lista).
  - **Não faça:** vazar tipos do Prisma (`Prisma.CardGetPayload` etc.) para fora do adapter.

## 3. Interface HTTP e tempo real

- [ ] 3.1 Criar `card.controller.ts` expondo `POST /boards/:boardId/cards`,
  `PATCH /boards/:boardId/cards/:id`, `DELETE /boards/:boardId/cards/:id` e
  `PATCH /boards/:boardId/cards/:id/move`, protegidos pelo guard de autenticação JWT global e
  pela checagem de `BoardMember` do quadro, seguindo a skill
  [backend-nest-controller](../../../.claude/skills/backend-nest-controller).
  - **Pré:** 1.2 e 2.2 concluídas; guard de membership da `005` disponível.
  - **Aceite:** usuário não-membro recebe `403`/`404` (conforme padrão do projeto) em todas as
    rotas; membro autenticado executa cada operação com sucesso; DTOs validam `title`
    obrigatório na criação e `toListId`/`position` obrigatórios no move.
  - **Não faça:** permitir mover cartão para lista de outro quadro (validar `toListId` contra o
    `boardId` da rota antes de chamar o caso de uso).
- [ ] 3.2 Após cada caso de uso ter sucesso, chamar
  `RealtimeEmitter.emitToBoard(boardId, event, payload)` (porta da `006`, injetada via provider
  já registrado pelo `BoardModule`) emitindo `card.created`, `card.updated`, `card.moved`
  (`{cardId, fromListId, toListId, position}`) ou `card.deleted`.
  - **Pré:** `RealtimeEmitter` exportada pelo `BoardModule` (`006`).
  - **Aceite:** teste de integração confirma que o emitter é chamado com o payload correto após
    cada mutação e **não** é chamado quando o caso de uso lança erro.
  - **Não faça:** emitir o evento antes de persistir a mutação, nem emitir em `boardId` diferente
    do da rota.
- [ ] 3.3 Mapear no i18n (pt/en) as chaves de erro dos endpoints de `/boards/:boardId/cards`
  (lista não encontrada, cartão não encontrado, `toListId` de outro quadro, não-membro).
  - **Pré:** estrutura de i18n do backend já existente (`001`/`003`).
  - **Aceite:** cada erro de domínio mapeado tem chave pt e en; nenhuma mensagem hardcoded em
    português direto no filtro de exceção.

## 4. Verificação

- [ ] 4.1 Rodar `npx tsc --noEmit` (backend), a suíte de testes (unitários dos casos de uso +
  integração do repositório e do controller) e validar manualmente com um cliente HTTP: criar
  cartão, editar, mover entre listas (checando renormalização de posições) e excluir, com o
  evento correspondente observado no gateway de tempo real (`006`).
  - **Pré:** tasks 1–3 concluídas.
  - **Aceite:** `tsc` limpo; suíte verde; validação manual registrada com evidência dos 4
    eventos (`card.created`, `card.updated`, `card.moved`, `card.deleted`) observados.
