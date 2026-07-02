<!-- TEMPLATE — design da seguranca de acesso. Placeholders: {{produto}}, {{namespace}}. -->

## Context

A autenticacao por e-mail+senha existe (`005`) e o modulo `auth` ja tem `user`, `crypto.provider` e o
gate de status no login. Esta mudanca adiciona a camada de seguranca de acesso: MFA por TOTP,
recuperacao de senha e primeiro acesso, todos no modulo `auth`.

Principio mantido: o dominio nao conhece token/JWT. O `verify-mfa` valida um codigo contra o segredo
do usuario (via `totp.provider`); o `challengeToken` que liga a etapa 1 a etapa 2 do login e da
camada HTTP.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- MFA por TOTP com setup (QR), confirmacao, verificacao, recovery codes e desativacao.
- Login em duas etapas quando MFA esta habilitado.
- Recuperacao de senha por token de uso unico, sem vazar existencia de e-mail.
- Primeiro acesso para contas criadas pelo admin definirem senha (+ MFA opcional).

**Non-Goals:**
- MFA por SMS/e-mail ou WebAuthn/passkeys — apenas TOTP nesta fase.
- Envio automatico de e-mail dos links (reset/primeiro acesso) — o link e gerado/exibido; o envio
  pode ser adicionado depois.
- Perfil completo de seguranca do usuario — e a `010` (aqui so o necessario para MFA/senha).

## Decisions

- **Segredo TOTP cifrado em repouso**: `mfaSecret` e armazenado cifrado; recovery codes sao hasheados
  (uso unico). Reaproveita o padrao de cifra do `crypto.provider`/uma cifra dedicada. Alternativa
  (segredo em texto) descartada por seguranca.
- **`totp.provider` como port**: o dominio depende da interface; a implementacao usa uma biblioteca
  TOTP (ex.: `otplib`). A geracao da imagem do QR fica no frontend a partir da URI `otpauth://`
  retornada — evita acoplar renderizacao de imagem ao backend.
- **Login em duas etapas so quando ha MFA**: `login-user` (`005`) permanece credencial+status; o
  controller decide. Sem MFA → resposta atual `{ token, user }`. Com MFA → `{ mfaRequired: true,
  challengeToken }` (token curto assinado que identifica o usuario e expira em minutos), e
  `POST /auth/login/mfa` valida desafio + codigo e emite o JWT. Alternativa (emitir o JWT e exigir MFA
  depois) descartada por expor sessao antes do segundo fator.
- **`verify-mfa` aceita TOTP ou recovery code**: o mesmo caso de uso cobre o segundo fator do login e
  um eventual gate de recurso sensivel; recovery code e de uso unico.
- **Token unificado para reset e primeiro acesso**: o agregado `password-reset` tem `kind`
  (`reset|first-access`); `reset-password` re-hasheia a senha e o modo `first-access` adiciona a etapa
  de setup de MFA opcional. Evita dois mecanismos de token quase identicos.
- **Nao vazar existencia de e-mail no forgot**: `request-password-reset` responde igual exista ou nao
  o e-mail; o token so e criado quando ha usuario.
- **Skills**: module-entity, module-aggregate, module-repository, module-use-case,
  backend-prisma-sync-module, backend-prisma-repository, backend-nest-controller.

## Risks / Trade-offs

- [Tamanho — MFA muda o login] → A mudanca e coesa (seguranca de acesso) mas grande; agrupada por
  responsabilidade. Pode ser dividida (MFA vs. recuperacao/primeiro acesso) ao custo de renumeracao.
- [Relogio dessincronizado no TOTP] → Janela de tolerancia na verificacao (passos de tempo adjacentes).
- [Perda do dispositivo MFA] → Recovery codes de uso unico; `disable-mfa` por admin pode ser previsto
  na gestao de colaboradores se necessario.
- [Token de reset/primeiro acesso vazado] → Token aleatorio de alta entropia, `expiresAt` curto, uso unico.
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
