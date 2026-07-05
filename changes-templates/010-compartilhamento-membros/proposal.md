<!--
TEMPLATE DE CHANGE — 010-compartilhamento-membros (gestao de membros do quadro).
Adiciona casos de uso e endpoints sobre o agregado BoardMember criado na 005, alem do
painel "Compartilhar" na pagina do quadro (009) e emissao do evento de tempo real (006).
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: TaskBoard Live (ex.: TaskBoard Live), taskboard (ex.: taskboard) → @taskboard
-->

> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/membros/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`) · e, **somente se o `design.md` citar
> nominalmente**: arquivos de código listados, `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

O quadro do TaskBoard Live hoje só pertence ao seu criador (`owner`). Para ser colaborativo, o
owner precisa poder convidar outras pessoas (que já tenham conta) para o quadro, e essas
pessoas precisam aparecer para quem já está com o quadro aberto — em tempo real. Esta mudança
entrega a gestão de membros (adicionar por e-mail, remover, listar) sobre o agregado
`BoardMember` já modelado na `005`, mais o painel "Compartilhar" na UI e a notificação ao vivo
via `RealtimeEmitter` (`006`).

## What Changes

- **Casos de uso** no módulo `board`: `add-member` (resolve o `User` pelo e-mail informado; se
  não existir uma conta com esse e-mail, retorna erro de domínio; cria `BoardMember`
  `role='member'`; erro se o e-mail já for membro do quadro), `remove-member` (apenas o owner
  pode remover; o próprio owner não pode ser removido), `list-members` (qualquer membro pode
  listar).
- **Autorização**: apenas o `owner` do quadro adiciona/remove membros; qualquer `BoardMember`
  (owner ou member) pode listar.
- **Endpoints** sob `/boards/:boardId/members`: `GET` (lista), `POST` `{ email }` (adiciona),
  `DELETE /members/:userId` (remove).
- **Tempo real**: após `add-member` ter sucesso, emite `member.added` via `RealtimeEmitter`
  (porta definida na `006`) com `{ boardId, user: { id, name, email }, role }`, para que quem já
  está com o quadro aberto veja o novo membro na lista de presença/membros ao vivo, sem recarregar
  a página.
- **Frontend**: painel/modal "Compartilhar" na página do quadro (`009`) — lista os membros
  atuais, permite convidar por e-mail e remover; os controles de gestão (convidar/remover) só
  aparecem para o owner do quadro.

## Capabilities

### New Capabilities
- `membros`: gestão de membros do quadro do TaskBoard Live — adicionar por e-mail, remover (só
  owner) e listar, com notificação em tempo real de novos membros para quem está com o quadro
  aberto.

### Modified Capabilities
<!-- Nenhuma: o agregado BoardMember e sua autorização por role já existem desde a 005; esta
change adiciona casos de uso, endpoints e UI sobre ele, sem alterar o modelo canônico. -->

## Impact

- **Backend**: módulo `board` ganha `add-member`, `remove-member`, `list-members`
  (casos de uso), controller de membros sob `/boards/:boardId/members`, chaves i18n de erro
  (`board.member.not.found`, `board.member.already.exists`, `board.owner.required`,
  `board.owner.cannot.be.removed`).
- **Frontend**: painel "Compartilhar" na página `/boards/[id]` (`009`), consumindo os três
  endpoints e reagindo ao evento `member.added` do socket já conectado pela `009`.
- **Domínio**: reaproveita o agregado `BoardMember` da `005`; nenhum novo model Prisma.
- **Dependências**: `005` (Board + BoardMember), `006` (`RealtimeEmitter`), `009` (página do
  quadro onde o painel vive).
- **Habilita**: colaboração real entre múltiplos usuários no mesmo quadro.
