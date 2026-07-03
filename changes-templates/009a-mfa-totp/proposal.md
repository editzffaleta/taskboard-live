<!--
TEMPLATE DE CHANGE — 009a-mfa-totp (mecanismo MFA por TOTP + tela A3).
Split da antiga 009 (densa): mecanismo MFA aqui; login em duas etapas na 009b;
recuperacao de senha e primeiro acesso na 009c.
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: {{produto}} (ex.: AlphaBet), {{namespace}} (ex.: alphabet) → @{{namespace}}
Codigos de tela (A3) referem-se aos seus mockups; ajuste-os.
-->

> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/seguranca-acesso/spec.md` e
> `openspec/specs/registro-usuario/spec.md` (se existirem) · esta change (`proposal.md`,
> `design.md`, `tasks.md`, `specs/`, `mockups/` se houver) · e, **somente se o `design.md`
> citar nominalmente**: arquivos de código listados, `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

A autenticacao atual (`005`) e so e-mail+senha. O {{produto}} precisa do segundo fator: MFA por
TOTP com setup (tela A3), confirmacao, verificacao e desativacao, com recovery codes de uso unico.
Esta mudanca entrega o **mecanismo completo** no modulo `auth`; o login em duas etapas que o
consome e a `009b`; recuperacao de senha e primeiro acesso sao a `009c`. Alem do login, o
`verify-mfa` habilita um eventual **gate de MFA** para recursos sensiveis.

## What Changes

- **Entidade `user`**: estender com `mfaEnabled` (boolean, default `false`), `mfaSecret` (cifrado,
  opcional), `mfaConfirmedAt` (opcional) e `recoveryCodes` (lista hasheada, uso unico).
- **Port `totp.provider.ts`** no dominio (gerar segredo, montar URI `otpauth://`, verificar codigo
  com janela de tolerancia) e implementacao com biblioteca TOTP no backend.
- **Casos de uso**: `setup-mfa` (gera segredo + URI para QR, estado nao confirmado), `confirm-mfa`
  (valida o primeiro codigo, habilita `mfaEnabled` e gera recovery codes exibidos uma unica vez),
  `verify-mfa` (valida TOTP **ou** recovery code, consumindo o recovery usado) e `disable-mfa`.
- **Persistencia**: migration estendendo `user` com os campos de MFA; repositorio atualizado;
  `mfaSecret` cifrado em repouso e recovery codes hasheados.
- **Endpoints autenticados**: `POST /auth/mfa/setup`, `POST /auth/mfa/confirm` e
  `POST /auth/mfa/disable`. (O consumo do `verify-mfa` no login e a `009b`.)
- **Frontend**: **A3** — setup com QR renderizado no cliente a partir da URI `otpauth://`,
  confirmacao do primeiro codigo, exibicao unica dos recovery codes e desativacao. Chaves i18n novas.

## Capabilities

### New Capabilities
- `seguranca-acesso`: Camada de seguranca de acesso do {{produto}} — nesta mudanca, o mecanismo de
  MFA por TOTP (setup/confirmacao/verificacao/desativacao) com segredo cifrado e recovery codes
  hasheados de uso unico, e a tela A3. (Login em duas etapas entra pela `009b`; recuperacao de
  senha e primeiro acesso pela `009c`.)

### Modified Capabilities
- `registro-usuario` (`004`): a entidade `user` e estendida com `mfaEnabled`, `mfaSecret`,
  `mfaConfirmedAt` e `recoveryCodes`.

## Impact

- **Dominio (`modules/auth`)**: `user` estendido (MFA); port `totp.provider.ts`; casos de uso
  `setup`/`confirm`/`verify`/`disable-mfa` + testes.
- **Backend**: biblioteca TOTP + cifra do segredo; migration de `user`; repositorio;
  `auth.controller` com os endpoints de MFA autenticados; testes de integracao HTTP.
- **Frontend**: tela A3 no modulo `auth`; chaves i18n novas.
- **Dependencias**: `user`/login (`004`/`005`), `crypto.provider` (`004`).
- **Habilita**: o login em duas etapas (`009b`) e o MFA opcional do primeiro acesso (`009c`)
  consomem este mecanismo; a gestao de MFA no perfil (`010`) reusa os endpoints; um eventual gate
  de MFA para recursos sensiveis reaproveita `verify-mfa`.
