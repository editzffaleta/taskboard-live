## Design — 020-config-quadro

## Contexto

O módulo `board` já tem os agregados `board`/`membership` (`005`, guard de owner em
`rename-board`/`delete-board`), `label` (`016`, CRUD completo + atribuição em cartão) e o
painel de membros do frontend (`010`). O tempo real (`006`) provê `RealtimeEmitter` já
registrada/exportada pelo `BoardModule`. Esta change **não cria** agregado novo: estende `Board`
com `color` e monta, no frontend, uma tela que **compõe** endpoints já existentes de três
agregados diferentes — não reimplementa nenhum deles.

## Backend

### Campo `color` no `Board`

`modules/board/src/board/model/board.entity.ts`: adicionar `color?: string | null` ao
`BoardState` e getter `color`. Validação (no `validate()`): `color`, quando presente, deve
pertencer à paleta fechada de 7 tokens do mockup (mesmo padrão de `LABEL_COLORS` do agregado
`label`, `016`, que usa `InRule`):

```
BOARD_COLORS = ["blue", "purple", "green", "red", "amber", "cyan", "slate"]
```

Mapeamento visual (mockup → token, para o frontend usar como fonte única, análogo ao
`label-color.util.ts` da `016`):

| token    | hex mockup |
|----------|------------|
| `blue`   | `#2563EB`  |
| `purple` | `#7C3AED`  |
| `green`  | `#059669`  |
| `red`    | `#E11D48`  |
| `amber`  | `#D97706`  |
| `cyan`   | `#0891B2`  |
| `slate`  | `#475569`  |

Default: `"blue"` (primeiro swatch do mockup, já selecionado por padrão na captura). Quadros
existentes (antes da migration) recebem `color = "blue"` via `@default("blue")` no Prisma —
não fica `null` para simplificar o frontend (sempre há uma cor a exibir).

**Não faça**: não usar `enum` nativo do Prisma (mesma decisão da `016`, para portabilidade —
strings validadas no domínio).

### Persistência

`apps/backend/prisma/models/board.model.prisma`: adicionar `color String @default("blue")` ao
model `Board`. Gerar migration (`prisma migrate dev --create-only` seguido de `migrate deploy`,
mesmo procedimento documentado na task 2.1 da `016` para evitar o bug do `--schema` explícito
ignorar a pasta modular).

### Caso de uso

Decisão: **estender `RenameBoard`** em vez de criar um caso de uso novo. Renomear a classe/uso
não é necessário — `RenameBoard` já valida owner e já persiste via `BoardRepository.update`;
basta o `execute` aceitar `name?` e `color?` (ao menos um dos dois obrigatório) e validar
`color` contra `BOARD_COLORS` quando informado. Motivo: a tela "Geral" do mockup edita nome e
cor no mesmo formulário/submit lógico; dois casos de uso para o mesmo agregado, mesmo guard de
owner e mesmo `update()` de repositório duplicaria a checagem de permissão sem ganho de clareza.
Renomear o arquivo/classe é opcional — se o especialista de backend preferir, pode extrair para
`update-board-appearance.usecase.ts` reaproveitando a mesma validação de owner, desde que **não
duplique** a checagem de `membership.role !== "owner"` em dois lugares. Ambas as abordagens são
aceitas; registrar a escolha na evidência da task.

`modules/board/src/board/usecase/rename-board.usecase.ts` (ou o novo arquivo, se essa rota for
escolhida): `RenameBoardIn` ganha `color?: string`; ao persistir, `board.clone({ name, color })`
antes de `validate()`.

### Endpoint e tempo real

`apps/backend/src/modules/board/board.controller.ts`: o handler `PATCH /boards/:id` já existe
(`rename`) — estender o `body` para aceitar `{ name?: string; color?: string }` e repassar ao
caso de uso. `BoardResponse`/`toResponse` (e `BoardDetailResponse`, se aplicável) passam a
incluir `color`.

Após a mutação ter sucesso, chamar `RealtimeEmitter.emitToBoard(boardId, "board.updated", {
board: toResponse(board) })` (porta da `006`, já injetada nos demais controllers do módulo
`board` — seguir o mesmo padrão de injeção do `card-label.controller.ts` da `016`). Nenhum outro
handler de `board.controller.ts` (`create`, `getOne`, `remove`) muda de comportamento.

### Fora de escopo no backend

- Nenhum endpoint de arquivar (`022`).
- Nenhum endpoint de visibilidade/link público — a seção "Visibilidade" do mockup é tratada
  **apenas no frontend** como informativa/estática (ver seção Frontend abaixo); nenhum campo
  novo no `Board` além de `color`.
- `label` (`016`), `membership`/membros (`010`) e `delete-board` (`005`) **não são tocados** no
  backend — a tela consome seus endpoints existentes tal como estão.

## Frontend

### Rota vs. modal

Decisão: **rota dedicada** `/boards/[id]/settings` (não modal). Motivo: o mockup mostra uma
página completa de scroll (`Geral` → `Visibilidade` → `Etiquetas` → `Zona de perigo`), com
cabeçalho próprio de breadcrumb ("Sprint 42 · Produto › Configurações") — um modal ficaria
apertado para quatro seções e o conteúdo de etiquetas pode crescer bastante. A rota vive em
`apps/frontend/src/app/(private)/boards/[id]/settings/page.tsx` (mesma convenção de rotas
privadas já usada pelo quadro ao vivo), delegando para um componente
`board-settings.component.tsx` em `apps/frontend/src/modules/boards/components/`. Um botão/link
de "Configurações" (ícone de engrenagem) no cabeçalho do quadro ao vivo (visível só para o
owner) navega para essa rota.

### Acesso restrito ao owner

A página busca `GET /boards/:id` (já retorna `BoardDetailResponse`, hidratado com membros) para
descobrir se o `requesterId` (usuário logado) é o `owner`. Se não for owner: redirecionar de
volta para o quadro (`/boards/[id]`) ou renderizar uma versão só-leitura mínima (nome e cor,
sem controles) — decisão simples e explícita a registrar na evidência da task; o padrão do
projeto (autorização por `BoardMember`, `AGENTS.md`) já resolve isso no backend (`403` do
`rename`/`delete`), o frontend só precisa não oferecer os controles a quem não é owner.

### Seções da tela → endpoints/componentes

| Seção do mockup | Fonte | Endpoint(s) |
|---|---|---|
| **Geral** (nome) | novo formulário nesta tela | `PATCH /boards/:id` `{name}` (já existe, `005`) |
| **Geral** (cor/plano de fundo) | novo seletor de 7 swatches (paleta `BOARD_COLORS`) | `PATCH /boards/:id` `{color}` (novo, esta change) |
| **Visibilidade** | estático/informativo — renderizar só a opção "Privado" marcada, sem os rádios "Por link"/"Espaço de trabalho" funcionais (ou omitir a seção inteira) | nenhum — **não** criar endpoint |
| **Etiquetas** | novo componente `board-labels-manager.component.tsx` (lista com criar/editar/excluir, reaproveitando o mesmo mapeamento de cor de `label-color.util.ts` da `016`) | `GET/POST /boards/:boardId/labels`, `PATCH/DELETE /boards/:boardId/labels/:id` (`016`, já existentes) |
| **Membros** | reaproveitar `members-panel.component.tsx` (`010`) embutido nesta página | endpoints de `members.api.ts` (`010`, já existentes) |
| **Zona de perigo → Arquivar** | **não implementar**; renderizar desabilitado com rótulo "em breve" OU omitir a linha inteira (decisão do especialista de frontend, registrar na evidência) | nenhum |
| **Zona de perigo → Excluir quadro** | reaproveitar o fluxo de exclusão já existente (mesmo endpoint da `005`), com diálogo de confirmação (reaproveitar componente de diálogo já usado em outra parte do app, se existir) | `DELETE /boards/:id` (`005`, já existente) |

### Reflexo em tempo real e no dashboard

- `use-board-socket.ts` (ou hook equivalente do quadro ao vivo) ganha o listener `board.updated`
  `{board}`, atualizando `BoardState.name`/`BoardState.color` — usado para reconciliar o
  cabeçalho do quadro ao vivo (mostra a cor como uma faixa/indicador, análogo ao ponto colorido
  já usado na barra lateral do mockup do dashboard).
- `boards-dashboard.component.tsx` (`005`): cada card de quadro passa a exibir a cor
  (`board.color`) como indicador visual (ex.: barra superior ou ponto lateral, reaproveitando o
  mesmo mapeamento `BOARD_COLORS` → hex/classe Tailwind do frontend). Não é necessário socket
  aqui — o dashboard já busca `GET /boards` a cada visita; opcionalmente, se o dashboard já tiver
  algum socket global, reconciliar também, mas isso **não é obrigatório** nesta change.
- Mapear a paleta `BOARD_COLORS` em um util novo, `board-color.util.ts`
  (`apps/frontend/src/modules/boards/util/`), fechado nas 7 cores (mesmo padrão do
  `label-color.util.ts` da `016` — sem interpolação dinâmica de classe Tailwind).

### i18n

pt/en: título da tela, rótulos das seções (Geral, Visibilidade, Etiquetas, Membros, Zona de
perigo), textos de "Arquivar" (se renderizado desabilitado, com nota "em breve"), texto de
confirmação de exclusão, chaves de erro do novo `PATCH /boards/:id` com `color` inválida
(reaproveitar a convenção de códigos crus já usada em `board`/`label`, sem infraestrutura nova
de i18n de domínio — mesma decisão registrada na `016`).

## Fora de escopo (reforço)

- Arquivar/restaurar quadro (`022`).
- Visibilidade por link / espaço de trabalho / multi-tenancy.
- Reimplementação de CRUD de etiqueta no backend (`016`), de membros (`010`) ou de exclusão de
  quadro (`005`) — a tela apenas consome esses endpoints existentes.
- Novo agregado de domínio — só o campo `color` é adicionado a `Board`.
