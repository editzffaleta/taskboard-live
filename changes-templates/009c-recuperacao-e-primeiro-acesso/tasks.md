<!-- TEMPLATE — tasks da recuperacao de senha e primeiro acesso (A4/A5). Checkboxes vazios; marque
com evidencia. Cada task tem **Aceite**. Placeholders: {{produto}}, {{namespace}}. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `004`/`005` (`user`/`crypto.provider`/login), `008a` (contas criadas pelo
> admin). O passo de MFA no primeiro acesso e **opcional e condicionado a `009a` aplicada**.
> **Nao faca:** envio automatico de e-mail dos links (gerados/exibidos); mecanismo de MFA/login em
> duas etapas (`009a`/`009b`); troca de senha logado com senha atual (`010`). **Principio:** o
> token daqui e do agregado `password-reset` (aleatorio, uso unico) — nao e JWT.

## 1. Dominio (modulo auth)

- [ ] 1.1 Criar o agregado `password-reset` (skill [module-aggregate](../../../.claude/skills/module-aggregate)): `userId`, `token` (aleatorio seguro, unico), `kind` (`reset|first-access`), `expiresAt`, `used`. Contrato com `findByToken` (skill [module-repository](../../../.claude/skills/module-repository)).
  - **Aceite:** agregado + contrato; token de alta entropia.
- [ ] 1.2 Implementar (skill [module-use-case](../../../.claude/skills/module-use-case)): `request-password-reset` (cria token so se o usuario existir; resposta indiferente a existencia), `reset-password` (valida token `kind=reset`, re-hasheia a senha, marca `used`) e `set-initial-password` (modo `first-access`: define a senha inicial).
  - **Aceite:** forgot nao vaza existencia; reset re-hasheia e invalida; first-access define senha inicial.
- [ ] 1.3 Cobrir com testes: token inexistente, expirado e ja usado; reset valido; primeiro acesso valido.
  - **Aceite:** cenarios cobertos; suite do `auth` verde.

## 2. Back-end

- [ ] 2.1 Sincronizar o Prisma (skill [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module)): criar o model `password_reset` (token unico).
  - **Aceite:** migration aplicada; `password_reset` com `token @unique`; `prisma:generate` ok.
- [ ] 2.2 Implementar o repositorio Prisma de `password-reset` (skill [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository)), sem alterar o contrato.
  - **Aceite:** repositorio implementa o contrato; `tsc --noEmit` ok.
- [ ] 2.3 Criar os endpoints publicos (via `public.decorator`): `POST /auth/password/forgot`, `POST /auth/password/reset`, `GET /auth/first-access/:token` (validar) e `POST /auth/first-access/:token` (definir senha).
  - **Aceite:** publicos funcionando; forgot com resposta neutra; GET de first-access so valida (nao autentica).
- [ ] 2.4 Estender `auth.integration.http`: esqueci/redefinir senha (token invalido/expirado/usado) e primeiro acesso (validar + definir senha). Validar manualmente.
  - **Aceite:** cenarios cobertos.

## 3. Front-end

- [ ] 3.1 **A4 — Recuperacao de senha**: telas publicas de solicitacao (`/auth/password/forgot`) e de redefinicao por token (`/auth/password/reset`), com mensagens neutras.
  - **Aceite:** fluxo ponta a ponta; mensagens neutras no forgot.
- [ ] 3.2 **A5 — Primeiro acesso**: rota publica por token que valida (`GET /auth/first-access/:token`) e permite definir a senha; **se a `009a` estiver aplicada**, oferecer na sequencia o setup de MFA opcional (reusa a A3).
  - **Aceite:** validar token + definir senha funcionando; passo de MFA presente apenas com a `009a` aplicada (e ausente sem ela).
- [ ] 3.3 Acrescentar as chaves i18n novas (pt/en): `password-reset.not_found`/`expired`/`already_used`, mensagens neutras do forgot e rotulos de A4/A5.
  - **Aceite:** chaves presentes em pt e en.

## 4. Verificacao

- [ ] 4.1 Rodar `npx tsc --noEmit` (backend e frontend), os testes do `auth` e validar manualmente: esqueci a senha → redefinir; token reutilizado rejeitado; primeiro acesso de uma conta criada pelo admin (`008a`) definindo a senha e logando em seguida.
  - **Aceite:** `tsc` limpo; testes verdes; fluxos validados ponta a ponta.
