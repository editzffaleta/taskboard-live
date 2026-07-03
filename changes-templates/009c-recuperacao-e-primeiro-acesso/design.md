<!-- TEMPLATE — design da recuperacao de senha e primeiro acesso. Placeholders: {{produto}}, {{namespace}}. -->

## Context

O modulo `auth` tem `user`, `crypto.provider` (`004`) e login com gate de status (`005`); o admin
cria contas pelo wizard D3 (`008a`) que precisam definir a propria senha. Esta mudanca fecha a
camada de seguranca de acesso com o token de uso unico em dois modos (`reset` e `first-access`).

Principio mantido: o dominio nao conhece token de sessao/JWT; o token daqui e um **artefato de
dominio proprio** (`password-reset`), aleatorio e de uso unico — nao um JWT.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Recuperacao de senha por token de uso unico, sem vazar existencia de e-mail (A4).
- Primeiro acesso para contas criadas pelo admin definirem senha (A5), com MFA opcional quando a
  `009a` estiver aplicada.
- Token de alta entropia, com expiracao curta e invalidacao apos o uso.

**Non-Goals:**
- Envio automatico de e-mail dos links (reset/primeiro acesso) — o link e gerado/exibido; o envio
  pode ser adicionado depois.
- Mecanismo de MFA e login em duas etapas — sao a `009a`/`009b`.
- Troca de senha logado (com senha atual) — e a `010` (perfil), caso de uso distinto do reset.

## Decisions

- **Token unificado para reset e primeiro acesso**: o agregado `password-reset` tem `kind`
  (`reset|first-access`); `reset-password` re-hasheia a senha e o modo `first-access` define a
  senha inicial. Evita dois mecanismos de token quase identicos.
- **Nao vazar existencia de e-mail no forgot**: `request-password-reset` responde igual exista ou
  nao o e-mail; o token so e criado quando ha usuario.
- **MFA opcional no primeiro acesso e condicional**: a A5 so oferece o passo de setup de MFA
  (reusando a A3) se a `009a` estiver aplicada no projeto; sem ela, o fluxo termina na senha.
  Verificacao no build: a existencia dos endpoints `/auth/mfa/*` decide a exibicao do passo.
- **Skills**: module-aggregate, module-repository, module-use-case,
  backend-prisma-sync-module, backend-prisma-repository, backend-nest-controller.

## Mockups (Claude Design) — inclusão condicional por tela

- Tela desta change **com** mockup do Claude Design → o mockup vive **dentro desta change**, em
  `mockups/<tela>/` (ex.: `mockups/a4-recuperar-senha/`, `mockups/a5-primeiro-acesso/`). Tela
  **sem** mockup **não** gera subpasta — siga apenas este design.
- Execução: **reproduza fielmente o layout do mockup**, substituindo **todo dado fake/placeholder
  por dado real** vindo do backend — proibido lorem/valor mockado no código final.
- Os códigos de tela citados referem-se a esses mockups; ajuste-os ao seu projeto.

## Risks / Trade-offs

- [Token de reset/primeiro acesso vazado] → Token aleatorio de alta entropia, `expiresAt` curto,
  uso unico; `GET /first-access/:token` so valida, nao autentica.
- [Enumeracao de e-mails no forgot] → Resposta neutra e identica exista ou nao o usuario.
- [Link sem envio automatico] → O admin gera/encaminha o link (decisao explicita de escopo); o
  envio por e-mail entra como change propria quando houver provedor.
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
