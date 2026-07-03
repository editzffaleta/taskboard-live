<!-- TEMPLATE — tasks do mecanismo de MFA (TOTP + tela A3). Checkboxes vazios; marque com evidencia.
Cada task tem **Aceite**. Placeholders: {{produto}}, {{namespace}}. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `004`/`005` (`user`/login, `crypto.provider`). **Nao faca:** login em duas
> etapas (`009b`); recuperacao de senha/primeiro acesso (`009c`); MFA por SMS/e-mail ou
> WebAuthn/passkeys (so TOTP); perfil de seguranca (`010`). **Principio:** o dominio nao conhece
> token/JWT.

## 1. Dominio (modulo auth)

- [ ] 1.1 Estender a entidade `user` (skill [module-entity](../../../.claude/skills/module-entity)): `mfaEnabled` (boolean, default `false`), `mfaSecret` (cifrado, opcional), `mfaConfirmedAt` (opcional), `recoveryCodes` (lista hasheada, uso unico).
  - **Aceite:** campos na entidade; `mfaSecret` nunca em claro na leitura; teste atualizado.
- [ ] 1.2 Definir o port `totp.provider.ts` no modulo `auth` (gerar segredo, montar URI `otpauth://`, verificar codigo com janela de tolerancia).
  - **Aceite:** interface (port) definida no dominio, sem implementacao concreta.
- [ ] 1.3 Implementar os casos de uso (skill [module-use-case](../../../.claude/skills/module-use-case)): `setup-mfa` (gera segredo + URI, estado nao confirmado), `confirm-mfa` (valida o primeiro codigo, habilita `mfaEnabled`, gera recovery codes), `verify-mfa` (valida TOTP **ou** recovery code de uso unico), `disable-mfa`.
  - **Aceite:** setup nao habilita; confirm habilita e gera recovery codes (exibidos 1x); verify aceita TOTP ou recovery (consome o recovery usado); disable desativa.
- [ ] 1.4 Cobrir os casos de uso de MFA com testes (codigo valido/invalido, recovery code consumido, confirmacao habilitando, desativacao).
  - **Aceite:** cenarios cobertos; suite do `auth` verde.

## 2. Back-end

- [ ] 2.1 Sincronizar o Prisma (skill [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module)): estender `user` com os campos de MFA.
  - **Aceite:** migration aplicada; `prisma:generate` ok.
- [ ] 2.2 Atualizar o repositorio Prisma de `user` (skill [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository)), sem alterar o contrato.
  - **Aceite:** repositorio implementa o contrato; `tsc --noEmit` ok.
- [ ] 2.3 Instalar a biblioteca TOTP (ex.: `otplib`) e implementar `totp.provider` em `apps/backend/src/modules/auth`; cifrar o `mfaSecret` em repouso e hashear os recovery codes.
  - **Aceite:** `totp.provider` implementa o port; `mfaSecret` cifrado no banco; recovery codes hasheados.
- [ ] 2.4 Criar os endpoints autenticados no `auth.controller.ts`: `POST /auth/mfa/setup`, `POST /auth/mfa/confirm` e `POST /auth/mfa/disable`.
  - **Aceite:** endpoints exigem sessao; setup devolve a URI `otpauth://`; confirm/disable operam no usuario logado.
- [ ] 2.5 Estender `auth.integration.http`: setup → confirm com codigo valido (habilita), confirm com codigo invalido (rejeita), disable. Validar manualmente com app autenticador (TOTP real).
  - **Aceite:** cenarios cobertos com TOTP real.

## 3. Front-end

- [ ] 3.1 **A3 — Setup de MFA**: a partir da URI `otpauth://`, renderizar o QR Code, confirmar o primeiro codigo (`/auth/mfa/confirm`) e exibir os recovery codes uma unica vez; disponibilizar a desativacao.
  - **Aceite:** QR + confirmacao + recovery codes 1x; desativacao disponivel.
- [ ] 3.2 Acrescentar as chaves i18n novas (pt/en): erros (`mfa.invalid_code`, `mfa.already_enabled`, etc.), rotulos de MFA e dos recovery codes.
  - **Aceite:** chaves presentes em pt e en.

## 4. Verificacao

- [ ] 4.1 Rodar `npx tsc --noEmit` (backend e frontend), os testes do `auth` e validar manualmente: setup com QR em app autenticador real → confirmar → recovery codes exibidos 1x → desativar.
  - **Aceite:** `tsc` limpo; testes verdes; fluxo validado com TOTP real.
