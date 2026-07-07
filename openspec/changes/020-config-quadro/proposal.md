> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/config-quadro/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/config-quadro/spec.md`) ·
> `openspec/changes/020-config-quadro/mockups/` (`Configuracoes do Quadro.dc.html`, PNGs) ·
> e, **somente se o `design.md` citar nominalmente**: arquivos de código listados,
> `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

O TaskBoard Live já permite criar, renomear e excluir um quadro (`005`), convidar/gerenciar
membros (`010`) e criar/editar/excluir etiquetas via popover do cartão (`016`). Essas três
capacidades hoje vivem espalhadas (endpoints existem, mas não há uma tela única que reúna
gestão do quadro). O mockup `Configuracoes do Quadro.dc.html` mostra a tela que fecha esse
buraco: uma página de **Configurações do Quadro**, acessível só pelo owner, com quatro seções —
**Geral** (nome + cor/realce do quadro), **Etiquetas** (CRUD completo em lista, não só o popover
do cartão), **Membros** (o mesmo painel da `010`) e **Zona de perigo** (excluir quadro). Esta
change entrega essa tela, reaproveitando os endpoints já existentes de `005`/`010`/`016` e
adicionando apenas o que falta: um campo `color` no `Board` para o realce/cor do quadro.

## What Changes

- **Backend**: adicionar o campo `color` (string, nullable, default definido no design) à
  entidade `Board` e ao model Prisma, com migration. Estender `update-board`/expor um novo caso
  de uso (`update-board-appearance` ou extensão de `rename-board` — decidido no `design.md`)
  para o owner alterar `name`/`color` do quadro. Emitir `board.updated` via `RealtimeEmitter`
  para a sala `board:{boardId}` após a mutação ter sucesso, para que qualquer cliente com o
  quadro aberto reflita nome/cor sem recarregar.
- **Frontend**: nova tela/rota de Configurações do Quadro (decisão de rota vs. modal registrada
  no `design.md`), visível só para o owner do quadro (membro comum não acessa ou vê versão
  somente leitura, conforme o `design.md` decidir), reproduzindo as seções do mockup:
  - **Geral**: renomear (endpoint já existente da `005`) e escolher a cor/realce do quadro
    (novo endpoint).
  - **Etiquetas**: CRUD completo em lista (criar, renomear/recolorir, excluir), usando os
    endpoints já existentes `GET/POST /boards/:boardId/labels` e
    `PATCH/DELETE /boards/:boardId/labels/:id` da `016` — aqui é a tela dedicada de gestão que
    a `016` deixou explicitamente fora de escopo.
  - **Membros**: reaproveitar o painel/endpoints de convite e gestão de papel já entregues pela
    `010` (`members-panel.component.tsx` e sua API), sem reimplementar.
  - **Zona de perigo**: excluir quadro com confirmação, usando o endpoint `DELETE /boards/:id`
    já existente da `005` — sem reimplementar a exclusão.
  - A cor do quadro passa a ser exibida no dashboard ("Meus quadros") e no cabeçalho do quadro
    ao vivo, como indicador visual (realce), reagindo em tempo real a `board.updated`.
  - i18n pt/en para todos os textos novos e chaves de erro do novo endpoint de cor.

## Fora de escopo (explícito)

- **Arquivar quadro**: o mockup mostra "Arquivar quadro" na zona de perigo, mas isso é a change
  `022` (arquivar/restaurar) — **não implementar** aqui. Se a seção "Arquivar" do mockup for
  reproduzida na tela, deve aparecer **desabilitada** com indicação "em breve", ou ser omitida
  nesta change (decisão registrada no `design.md`); nunca implementar arquivamento real.
- **Visibilidade por link / espaço de trabalho**: o mockup mostra uma seção "Visibilidade"
  (privado / por link / espaço de trabalho). O TaskBoard Live não tem esse conceito (não há
  multi-tenancy nem RBAC global — ver `AGENTS.md`). Esta change **não implementa** visibilidade
  pública por link; a seção do mockup é tratada como **estática/informativa** (mostrando sempre
  "Privado", sem opções funcionais) ou **omitida** — decisão e justificativa no `design.md`.
- **Reimplementação de exclusão de quadro** (`005`), **gestão de membros** (`010`) ou **CRUD de
  etiqueta no backend** (`016`) — todos reaproveitados via seus endpoints/casos de uso
  existentes, sem duplicar lógica de domínio.

## Capabilities

### New Capabilities
- `config-quadro`: tela "Configurações do Quadro" do TaskBoard Live, restrita ao owner, reunindo
  renomear + cor/realce do quadro (novo campo `Board.color` e endpoint), CRUD completo de
  etiquetas em lista (reaproveitando `016`), gestão de membros (reaproveitando `010`) e exclusão
  do quadro com confirmação (reaproveitando `005`); emissão de `board.updated` via
  `RealtimeEmitter` após a mutação de nome/cor; reflexo da cor no dashboard e no cabeçalho do
  quadro ao vivo.

### Modified Capabilities
<!-- Nenhuma: `board` (005), `membership`/membros (010) e `label`/etiquetas (016) são
reaproveitados via seus endpoints e casos de uso já existentes, sem alterar seus contratos —
apenas `Board` ganha o novo campo `color` e `board.updated` passa a ser emitido. -->

## Impact

- **Backend**: campo `color` na entidade `Board` (`modules/board/src/board/model/board.entity.ts`)
  e no model Prisma `Board`, migration; caso de uso para o owner alterar `name`/`color`;
  emissão de `board.updated` via `RealtimeEmitter` (porta da `006`); ajuste do `BoardResponse`/
  `BoardDetailResponse` para incluir `color`.
- **Frontend**: nova tela/rota de configurações do quadro, com as quatro seções do mockup;
  reuso de `members-panel.component.tsx` (`010`) e dos endpoints de etiqueta (`016`); indicador
  de cor no dashboard (`boards-dashboard.component.tsx`) e no cabeçalho do quadro ao vivo; i18n
  pt/en.
- **Domínio**: `Board` ganha `color: string | null`; nenhum novo agregado — `label` (`016`),
  `membership` (`010`) e `board` (`005`) permanecem estruturalmente os mesmos além do campo novo.
- **Dependências**: `005` (board CRUD, endpoints de renomear/excluir), `010` (membros,
  `members-panel.component.tsx`), `016` (endpoints de etiqueta), `006` (`RealtimeEmitter`).
- **Habilita**: `022` (arquivar/restaurar quadro, que estenderá esta mesma tela com a seção
  "Arquivar" hoje fora de escopo).
