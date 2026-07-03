<!--
TEMPLATE DE CHANGE — 009b-login-duas-etapas (segundo fator no login + tela A2).
Split da antiga 009 (densa): o mecanismo MFA e a 009a; aqui o login passa a exigi-lo;
recuperacao de senha e primeiro acesso sao a 009c.
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: {{produto}} (ex.: AlphaBet), {{namespace}} (ex.: alphabet) → @{{namespace}}
Codigos de tela (A2) referem-se aos seus mockups; ajuste-os.
-->

> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/seguranca-acesso/spec.md` e
> `openspec/specs/login-sessao/spec.md` (se existirem) · esta change (`proposal.md`,
> `design.md`, `tasks.md`, `specs/`, `mockups/` se houver) · e, **somente se o `design.md`
> citar nominalmente**: arquivos de código listados, `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

O mecanismo de MFA existe (`009a`), mas o login (`005`) ainda emite o JWT direto com
e-mail+senha. Esta mudanca fecha o ciclo: quando o usuario tem `mfaEnabled`, o login passa a ser
em **duas etapas** — credenciais primeiro, codigo TOTP/recovery depois — sem nunca emitir o token
de sessao antes do segundo fator (tela A2).

## What Changes

- **Login em duas etapas (modifica a `005`, so na camada HTTP)**: `POST /auth/login` passa a,
  quando `mfaEnabled`, responder um desafio (`{ mfaRequired: true, challengeToken }`) em vez do
  token de sessao; o novo `POST /auth/login/mfa` valida o desafio + o codigo (via `verify-mfa` da
  `009a`) e so entao emite o JWT, devolvendo `{ token, user }`. O dominio continua sem nocao de
  token; o `challengeToken` (curto, assinado, expira em minutos) e da camada HTTP.
- **Sem MFA nada muda**: usuario sem `mfaEnabled` segue recebendo `{ token, user }` direto.
- **Frontend**: ajuste do `AuthContext`/fluxo de login para as duas etapas e tela **A2**
  (verificacao do codigo TOTP ou recovery code no login). Chaves i18n novas.

## Capabilities

### New Capabilities
<!-- Nenhuma. Esta mudanca completa a capability criada pela 009a e modifica o login da 005. -->

### Modified Capabilities
- `login-sessao` (`005`): o login passa a ser em duas etapas quando o usuario tem MFA habilitado —
  a primeira valida credenciais e devolve um desafio; a segunda valida o codigo TOTP/recovery e
  emite o JWT. Sem MFA, o comportamento atual permanece.
- `seguranca-acesso` (`009a`): a capability ganha o consumo do `verify-mfa` no login (desafio +
  segunda etapa) e a tela A2.

## Impact

- **Dominio (`modules/auth`)**: intocado — reusa `login-user` (`005`) e `verify-mfa` (`009a`).
- **Backend**: `auth.controller` com a resposta de desafio no login e o novo
  `POST /auth/login/mfa`; assinatura/validacao do `challengeToken` na camada HTTP; testes de
  integracao HTTP.
- **Frontend**: `AuthContext` em duas etapas; tela A2; chaves i18n novas.
- **Dependencias**: mecanismo de MFA (`009a`), login/sessao (`005`).
- **Habilita**: nada novo alem do fluxo — o gate de MFA para recursos sensiveis ja e habilitado
  pela `009a`.
