<!--
TEMPLATE DE CHANGE — 017-refresh-token (sessao rotativa: access curto + refresh com deteccao de reuso).
Extensao transversal (opcional; recomendada p/ producao). Modifica o login da 005.
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: {{produto}} (ex.: AlphaBet), {{namespace}} (ex.: alphabet) → @{{namespace}}
-->

> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/login-sessao/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`) · e, **somente se o `design.md` citar
> nominalmente**: arquivos de código listados, `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

A sessao da `005` e um JWT unico de 7 dias: roubou, usou a semana inteira — sem revogacao. Esta
mudanca troca por **sessao rotativa**: access token curto (15 min) + refresh token de uso unico
em cookie httpOnly, com familia por dispositivo e **deteccao de reuso** (refresh usado duas vezes
revoga a familia inteira). Logout passa a revogar de verdade.

## What Changes

- **Access token**: mesmo JWT da `005`, expiracao reduzida (`ACCESS_TOKEN_TTL`, default 15 min);
  continua no armazenamento atual do cliente (o guard e o client HTTP nao mudam de contrato).
- **Refresh token**: aleatorio opaco (nao-JWT), entregue em **cookie httpOnly/secure/sameSite**
  com path restrito a `/auth/refresh`; persistido **hasheado** no model `refresh_token`
  (`familyId`, `userId`, `expiresAt` 7d, `revokedAt`, `replacedByHash?`).
- **Rotacao com deteccao de reuso**: `POST /auth/refresh` valida o refresh, emite novo par
  (access + refresh) e invalida o anterior; refresh ja usado/revogado → **revoga a familia
  inteira** (possivel roubo) e responde 401.
- **Login** (`005`) passa a emitir o par; **se `009b`**, o par so nasce apos a segunda etapa.
- **Logout real**: `POST /auth/logout` revoga a familia e limpa o cookie.
- **Frontend**: interceptor no client HTTP — `401` do access → tenta `POST /auth/refresh`
  (cookie vai sozinho) → repete a requisicao original; falhou o refresh → logout local e `/join`.
- Envs (`ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`) e migration do model.

## Capabilities

### New Capabilities
<!-- Nenhuma: sessao continua sendo a capability login-sessao, agora rotativa. -->

### Modified Capabilities
- `login-sessao` (`005`): a sessao passa de JWT unico de 7 dias para par access(15min)/refresh
  rotativo com deteccao de reuso, logout com revogacao e renovacao transparente no cliente.

## Impact

- **Dominio (`modules/auth`)**: agregado `refresh-token` (familia, hash, expiracao, revogacao) +
  casos de uso `issue`/`rotate`/`revoke-family` + testes; `login-user` intocado (a emissao e da
  camada HTTP, como na `005`).
- **Backend**: migration `refresh_token`; repositorio; `auth.controller` (login emite o par;
  `/auth/refresh`; `/auth/logout` revoga); cookie httpOnly com path restrito.
- **Frontend**: interceptor de renovacao no client HTTP; `AuthContext` trata expiracao do refresh.
- **Dependencias**: `005`, `004`. Condicional: `009b` (par emitido apos a 2ª etapa).
- **Habilita**: revogacao real de sessao (logout, troca de senha, acao de admin) e uma futura
  tela "meus dispositivos" sobre as familias.
