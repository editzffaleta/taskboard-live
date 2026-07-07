> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/arquivados/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/arquivados/spec.md`) ·
> `openspec/changes/022-arquivados/mockups/` (`Arquivados.dc.html`) ·
> e, **somente se o `design.md` citar nominalmente**: arquivos de código listados,
> `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

O TaskBoard Live só tem hoje um caminho para "remover" um cartão, uma lista ou um quadro: a
exclusão definitiva (`delete-card`/`delete-list`/`delete-board`, das changes `008`/`007`/`005`),
que é irreversível (hard delete). As changes `018` (detalhe do cartão) e `020` (configurações do
quadro) já desenharam a ação **"Arquivar"** nos seus mockups, mas explicitamente **não** a
implementaram — `020` chegou a renderizar o botão "Arquivar quadro" **desabilitado** com o
rótulo "Em breve" (`board-settings.component.tsx`, task `3.6` da `020`), aguardando esta change.
Faltava também qualquer lugar para ver e reverter o que foi arquivado. Esta change entrega esse
par completo: **arquivar/restaurar (soft-delete reversível)** de cartão, lista e quadro, mais a
tela **Arquivados** (mockup `Arquivados.dc.html`) que lista o que cada usuário arquivou e permite
restaurar ou excluir de vez.

**Arquivar não é excluir.** Excluir (`005`/`007`/`008`, hard delete) continua existindo e
continua irreversível — é o botão "Excluir definitivamente" da tela Arquivados. Arquivar é uma
operação nova, reversível, marcada por um carimbo `archivedAt` (distinto do `deletedAt` que já
existe, sem uso, no schema de `Board`/`BoardMember`). Um item arquivado desaparece das leituras
normais do quadro (o quadro ao vivo, o dashboard "Meus quadros") como se tivesse sumido para
quem está olhando, mas continua existindo no banco e pode voltar exatamente como estava.

## What Changes

- **Backend**: campo `archivedAt DateTime?` (nullable, default `null`) em `Card`, `List` e
  `Board` (migration única). Casos de uso `ArchiveCard`/`RestoreCard`,
  `ArchiveList`/`RestoreList`, `ArchiveBoard`/`RestoreBoard` — guard de membro do quadro para
  cartão/lista, guard de **owner** para quadro (mesmo guard já usado por `delete-board`).
  Endpoints novos (`POST .../archive`, `POST .../restore`, ver `design.md` para as rotas
  exatas). **Leituras normais passam a excluir arquivados**: `get-board-detail` não traz
  lists/cards com `archivedAt != null`; `list-my-boards` não traz boards com `archivedAt !=
  null`. Um endpoint novo e único, `GET /archived`, agrega para o usuário logado os cartões e
  listas arquivados dos quadros dos quais é membro, mais os quadros arquivados que possui —
  ver `design.md` para a forma exata do agregado. Tempo real: arquivar um card/list que está
  com o quadro aberto por outro cliente precisa fazê-lo sumir da tela ao vivo dessa pessoa;
  restaurar precisa fazê-lo reaparecer — a escolha exata de evento (reusar `card.deleted`/
  `list.deleted`/emitir `card.created`/`list.created` na restauração, ou eventos novos
  `*.archived`/`*.restored`) está registrada e justificada no `design.md`.
- **Frontend**: habilita as ações "Arquivar" que ficaram desabilitadas aguardando esta change —
  no detalhe do cartão (`018`) e na zona de perigo das configurações do quadro (`020`, o botão
  "Em breve" vira funcional) — e adiciona a ação "Arquivar lista" ao cabeçalho da coluna do
  quadro ao vivo. Nova tela **Arquivados** (reproduzindo `Arquivados.dc.html`: três abas
  Cartões/Listas/Quadros, contadores, busca, "Restaurar" e "Excluir definitivamente" por item,
  aviso de retenção de 90 dias como texto informativo — sem job de expurgo automático nesta
  change, ver `design.md`), acessível a partir de um item "Arquivados" na navegação lateral. i18n
  pt/en para todos os textos novos.

## Fora de escopo (explícito)

- **Expurgo automático após 90 dias**: o mockup menciona "mantidos por 90 dias antes de serem
  excluídos automaticamente" — este texto é **apenas informativo** nesta change; nenhum job/cron
  de expurgo é implementado. Ver `design.md`.
- **Arquivar em cascata implícito de itens filhos**: arquivar um quadro **não** marca
  `archivedAt` em suas listas/cartões (eles continuam com `archivedAt = null`); arquivar uma
  lista **não** marca `archivedAt` nos seus cartões. Um item só aparece na tela Arquivados por
  ter sido arquivado diretamente, ou por pertencer a um quadro/lista arquivado (que já o
  esconde das leituras normais transitivamente). Ver `design.md`.
- **Remoção do hard delete existente**: `DELETE /cards/:id`, `DELETE /lists/:id`,
  `DELETE /boards/:id` (`008`/`007`/`005`) continuam existindo, inalterados, como "Excluir
  definitivamente" a partir da tela Arquivados.

## Capabilities

### New Capabilities
- `arquivados`: soft-delete reversível (`archivedAt`) para `Card`, `List` e `Board`; casos de
  uso de arquivar/restaurar para os três agregados; leituras normais (`get-board-detail`,
  `list-my-boards`) passam a excluir itens arquivados; endpoint agregado `GET /archived` para a
  tela dedicada; tela **Arquivados** (três abas, restaurar, excluir definitivamente); habilita as
  ações "Arquivar" deixadas desabilitadas por `018` e `020`, mais "Arquivar lista".

### Modified Capabilities
<!-- `board` (005), `cartoes` (008), `listas` (007), `detalhe-cartao` (018) e `config-quadro`
(020) são estendidos (novo campo `archivedAt`, novos endpoints, leituras filtradas, botão
habilitado), sem alterar seus contratos existentes de criação/edição/exclusão/movimentação. -->

## Impact

- **Backend**: `archivedAt DateTime?` em `Card`, `List`, `Board` (models Prisma + migration);
  `modules/board/src/{card,list,board}/model/*.entity.ts` (getter/estado); repositórios
  (`*.prisma.ts`) filtram `archivedAt: null` nas leituras de listagem existentes e ganham
  métodos de arquivar/restaurar/listar-arquivados; casos de uso novos por agregado; controllers
  (`card.controller.ts`, `list.controller.ts`, `board.controller.ts`) ganham rotas de
  archive/restore; novo `ArchivedController` (`GET /archived`); `RealtimeEmitter` (porta da
  `006`) usada para refletir o desaparecimento/reaparecimento ao vivo.
- **Frontend**: botão "Arquivar" habilitado em `card-detail-modal.component.tsx` (`018`) e em
  `board-settings.component.tsx` (`020`, remove `disabled`); botão "Arquivar lista" no cabeçalho
  da coluna (`kanban-column.component.tsx`); nova rota/tela `Arquivados`
  (`apps/frontend/src/app/(private)/archived/page.tsx` ou equivalente, ver `design.md`); item de
  navegação lateral "Arquivados"; i18n pt/en.
- **Domínio**: `Card`, `List`, `Board` ganham `archivedAt: Date | null`; nenhum agregado novo.
- **Dependências**: `005` (board, guard de owner), `007` (list), `008` (card, `get-board-detail`),
  `006` (`RealtimeEmitter`), `018` (botão desabilitado no detalhe do cartão), `020` (botão
  desabilitado na zona de perigo).
- **Habilita**: nenhuma change futura depende diretamente desta; fecha o par arquivar/restaurar
  que `018` e `020` deixaram pendente.
