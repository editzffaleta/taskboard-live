<!--
TEMPLATE DE CHANGE — 009-mfa-recuperacao-primeiro-acesso (camada de seguranca de acesso).
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: {{produto}} (ex.: AlphaBet), {{namespace}} (ex.: alphabet) → @{{namespace}}
Codigos de tela (A2/A3/A4/A5) referem-se aos seus mockups; ajuste-os.
-->


> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/seguranca-acesso/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`, `mockups/` se houver) · e, **somente se o
> `design.md` citar nominalmente**: arquivos de código listados, `openspec/templates/`,
> `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

A autenticacao atual (`005`) e so e-mail+senha. O {{produto}} precisa de seguranca forte de acesso:
MFA por TOTP (telas A3 setup e A2 verificacao), recuperacao de senha (A4) e primeiro acesso para
contas criadas pelo admin (A5). Alem de proteger o login, o MFA habilita um eventual **gate de MFA**
para recursos sensiveis. Estes tres fluxos vivem no modulo `auth` e completam a camada de seguranca
de acesso.

## What Changes

- **MFA (TOTP)**: estender o `user` com `mfaEnabled`, `mfaSecret` (cifrado), `mfaConfirmedAt` e
  `recoveryCodes` (hasheados). Definir o port `totp.provider.ts` (gerar segredo, montar URI otpauth,
  verificar codigo) e implementa-lo com biblioteca TOTP. Casos de uso `setup-mfa` (gera segredo +
  URI para QR), `confirm-mfa` (valida o primeiro codigo, habilita e gera recovery codes),
  `verify-mfa` (valida TOTP ou recovery code) e `disable-mfa`.
- **Login em duas etapas (modifica a `005`)**: `POST /auth/login` passa a, quando `mfaEnabled`,
  responder um desafio (`{ mfaRequired: true, challengeToken }`) em vez do token de sessao; o novo
  `POST /auth/login/mfa` valida o desafio + codigo e so entao emite o JWT. O dominio continua sem
  nocao de token; o `challengeToken` e da camada HTTP.
- **Recuperacao de senha (A4)**: agregado `password-reset` (token unico, `expiresAt`, uso unico).
  Casos de uso `request-password-reset` (nao revela se o e-mail existe) e `reset-password` (valida o
  token, re-hasheia a senha, invalida o token). Endpoints publicos `POST /auth/password/forgot` e
  `POST /auth/password/reset`.
- **Primeiro acesso (A5)**: reusar o mecanismo de token (`password-reset` no modo `first-access`)
  para contas criadas pelo admin (`008`) definirem a propria senha e, opcionalmente, configurarem MFA.
  Rota publica por token.
- **Persistencia**: migration estendendo `user` (campos de MFA) e criando o model `password_reset`
  (token unico); repositorios.
- **Frontend**: A2 (verificacao MFA no login, em duas etapas), A3 (setup com QR + recovery codes),
  A4 (solicitar/redefinir senha), A5 (primeiro acesso). Chaves i18n novas.

## Capabilities

### New Capabilities
- `seguranca-acesso`: Camada de seguranca de acesso do {{produto}} — MFA por TOTP
  (setup/confirmacao/verificacao/desativacao) com recovery codes, recuperacao de senha por token e
  primeiro acesso para contas criadas pelo admin, com login em duas etapas e as telas A2/A3/A4/A5.

### Modified Capabilities
- `login-sessao` (`005`): o login passa a ser em duas etapas quando o usuario tem MFA habilitado — a
  primeira valida credenciais e devolve um desafio; a segunda valida o codigo TOTP/recovery e emite o JWT.
- `registro-usuario` (`004`): a entidade `user` e estendida com os campos de MFA.

## Impact

- **Dominio (`modules/auth`)**: `user` estendido (MFA); port `totp.provider.ts`; casos de uso de MFA
  (`setup`/`confirm`/`verify`/`disable`); agregado `password-reset` com `request`/`reset`/first-access + testes.
- **Backend**: biblioteca TOTP + cifra do segredo; migration de `user` e model `password_reset`;
  repositorios; `auth.controller` com login em duas etapas, endpoints de MFA, de recuperacao de senha
  e de primeiro acesso; testes de integracao HTTP.
- **Frontend**: telas A2/A3/A4/A5 no modulo `auth`; ajuste do `AuthContext` para o login em duas
  etapas; chaves i18n novas.
- **Dependencias**: `user`/login (`004`/`005`), `crypto.provider` (`004`), contas criadas pelo admin (`008`).
- **Habilita**: um eventual gate de MFA para recursos sensiveis reaproveita `verify-mfa`.
