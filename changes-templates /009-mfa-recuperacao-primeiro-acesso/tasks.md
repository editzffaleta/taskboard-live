<!-- TEMPLATE — tasks da seguranca de acesso (MFA/recuperacao/1º acesso). Checkboxes vazios; marque com
evidencia. Cada task tem **Aceite**. Por ser grande, pode ser quebrada (MFA vs. recuperacao/1º acesso).
Placeholders: {{produto}}, {{namespace}}. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `004`/`005` (`user`/login), `008` (contas criadas pelo admin). **Nao faca:** MFA
> por SMS/e-mail ou WebAuthn/passkeys (so TOTP); envio automatico de e-mail dos links (gerados/exibidos);
> perfil completo de seguranca (e a `010`). **Principio:** o dominio nao conhece token/JWT.

## 1. Dominio (modulo auth) — MFA

- [ ] 1.1 Estender a entidade `user` (skill [module-entity](../../../.claude/skills/module-entity)): `mfaEnabled` (boolean, default `false`), `mfaSecret` (cifrado, opcional), `mfaConfirmedAt` (opcional), `recoveryCodes` (lista hasheada, uso unico).
  - **Aceite:** campos na entidade; `mfaSecret` nunca em claro na leitura; teste atualizado.
- [ ] 1.2 Definir o port `totp.provider.ts` no modulo `auth` (gerar segredo, montar URI `otpauth://`, verificar codigo com janela de tolerancia).
  - **Aceite:** interface (port) definida no dominio, sem implementacao concreta.
- [ ] 1.3 Implementar os casos de uso (skill [module-use-case](../../../.claude/skills/module-use-case)): `setup-mfa` (gera segredo + URI, estado nao confirmado), `confirm-mfa` (valida o primeiro codigo, habilita `mfaEnabled`, gera recovery codes), `verify-mfa` (valida TOTP **ou** recovery code de uso unico), `disable-mfa`.
  - **Aceite:** setup nao habilita; confirm habilita e gera recovery codes (exibidos 1x); verify aceita TOTP ou recovery (consome o recovery usado); disable desativa.
- [ ] 1.4 Cobrir os casos de uso de MFA com testes (codigo valido/invalido, recovery code consumido, confirmacao habilitando, desativacao).
  - **Aceite:** cenarios cobertos.

## 2. Dominio (modulo auth) — recuperacao de senha e primeiro acesso

- [ ] 2.1 Criar o agregado `password-reset` (skill [module-aggregate](../../../.claude/skills/module-aggregate)): `userId`, `token` (aleatorio seguro, unico), `kind` (`reset|first-access`), `expiresAt`, `used`. Contrato com `findByToken` (skill [module-repository](../../../.claude/skills/module-repository)).
  - **Aceite:** agregado + contrato; token de alta entropia.
- [ ] 2.2 Implementar (skill [module-use-case](../../../.claude/skills/module-use-case)): `request-password-reset` (cria token so se o usuario existir; resposta indiferente a existencia), `reset-password` (valida token `kind=reset`, re-hasheia a senha, marca `used`) e `set-initial-password` (modo `first-access`: define a senha inicial e libera o setup de MFA opcional).
  - **Aceite:** forgot nao vaza existencia; reset re-hasheia e invalida; first-access define senha inicial.
- [ ] 2.3 Cobrir com testes: token inexistente, expirado e ja usado; reset valido; primeiro acesso valido.
  - **Aceite:** cenarios cobertos; suite do `auth` verde.

## 3. Back-end

- [ ] 3.1 Sincronizar o Prisma (skill [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module)): estender `user` com os campos de MFA e criar o model `password_reset` (token unico).
  - **Aceite:** migration aplicada; `password_reset` com `token @unique`; `prisma:generate` ok.
- [ ] 3.2 Atualizar/implementar os repositorios Prisma de `user` e `password-reset` (skill [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository)), sem alterar contratos.
  - **Aceite:** repositorios implementam os contratos; `tsc --noEmit` ok.
- [ ] 3.3 Instalar a biblioteca TOTP (ex.: `otplib`) e implementar `totp.provider` em `apps/backend/src/modules/auth`; cifrar o `mfaSecret` em repouso e hashear os recovery codes.
  - **Aceite:** `totp.provider` implementa o port; `mfaSecret` cifrado no banco; recovery codes hasheados.
- [ ] 3.4 Ajustar `auth.controller.ts`: `POST /auth/login` responde `{ mfaRequired: true, challengeToken }` quando `mfaEnabled` (em vez de `{ token, user }`); criar `POST /auth/login/mfa` que valida o `challengeToken` (curto, assinado) + o codigo via `verify-mfa` e emite o JWT. Criar `POST /auth/mfa/setup`, `POST /auth/mfa/confirm`, `POST /auth/mfa/disable` (autenticados).
  - **Aceite:** login com MFA devolve desafio (sem token); 2ª etapa emite o JWT; endpoints de MFA autenticados.
- [ ] 3.5 Criar os endpoints de senha/primeiro acesso (publicos via `public.decorator`): `POST /auth/password/forgot`, `POST /auth/password/reset`, `GET /auth/first-access/:token` (validar) e `POST /auth/first-access/:token` (definir senha + MFA opcional).
  - **Aceite:** publicos funcionando; forgot com resposta neutra.
- [ ] 3.6 Estender `auth.integration.http`: login com MFA (desafio + verificacao), codigo invalido, recovery code, esqueci/redefinir senha (token invalido/expirado/usado) e primeiro acesso. Validar manualmente (TOTP real).
  - **Aceite:** cenarios cobertos com TOTP real.

## 4. Front-end

- [ ] 4.1 Ajustar o `AuthContext`/fluxo de login para **duas etapas**: ao receber `{ mfaRequired, challengeToken }`, exibir a verificacao (A2) e enviar o codigo a `POST /auth/login/mfa`; ao receber o token, seguir o fluxo normal de sessao.
  - **Aceite:** login em duas etapas funcionando; sem token antes da verificacao.
- [ ] 4.2 **A3 — Setup de MFA**: a partir da URI `otpauth://`, renderizar o QR Code, confirmar o primeiro codigo (`/auth/mfa/confirm`) e exibir os recovery codes uma unica vez; disponibilizar a desativacao.
  - **Aceite:** QR + confirmacao + recovery codes 1x; desativacao disponivel.
- [ ] 4.3 **A4 — Recuperacao de senha**: telas publicas de solicitacao (`/auth/password/forgot`) e de redefinicao por token (`/auth/password/reset`), com mensagens neutras.
  - **Aceite:** fluxo ponta a ponta; mensagens neutras no forgot.
- [ ] 4.4 **A5 — Primeiro acesso**: rota publica por token que valida (`GET /auth/first-access/:token`) e permite definir a senha e, opcionalmente, configurar MFA.
  - **Aceite:** validar token + definir senha (+ MFA opcional) funcionando.
- [ ] 4.5 Acrescentar as chaves i18n novas (pt/en): erros (`mfa.invalid_code`, `password-reset.not_found`/`expired`/`already_used`, etc.), rotulos de MFA, recovery codes e mensagens de senha/primeiro acesso.
  - **Aceite:** chaves presentes em pt e en.

## 5. Verificacao

- [ ] 5.1 Rodar `npx tsc --noEmit` (backend e frontend), os testes do `auth` e validar manualmente: habilitar MFA → logout → login pede codigo (A2); login com recovery code; esqueci a senha → redefinir; primeiro acesso de uma conta criada pelo admin.
  - **Aceite:** `tsc` limpo; testes verdes; fluxos validados com TOTP real.
