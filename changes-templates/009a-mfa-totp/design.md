<!-- TEMPLATE — design do mecanismo de MFA (TOTP). Placeholders: {{produto}}, {{namespace}}. -->

## Context

A autenticacao por e-mail+senha existe (`005`) e o modulo `auth` ja tem `user`, `crypto.provider` e
o gate de status no login. Esta mudanca adiciona o **mecanismo** de MFA por TOTP no modulo `auth`;
o login em duas etapas que o consome e a `009b`; recuperacao/primeiro acesso sao a `009c`.

Principio mantido: o dominio nao conhece token/JWT. O `verify-mfa` valida um codigo contra o
segredo do usuario (via `totp.provider`); qualquer token de sessao/desafio e da camada HTTP.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- MFA por TOTP com setup (QR), confirmacao, verificacao, recovery codes de uso unico e desativacao.
- Segredo cifrado em repouso; recovery codes hasheados.
- Tela A3 (setup/confirmacao/recovery codes/desativacao).

**Non-Goals:**
- Login em duas etapas — e a `009b` (aqui o mecanismo apenas existe e e testavel).
- Recuperacao de senha e primeiro acesso — sao a `009c`.
- MFA por SMS/e-mail ou WebAuthn/passkeys — apenas TOTP nesta fase.
- Perfil completo de seguranca do usuario — e a `010` (que reusa os endpoints daqui).

## Decisions

- **Segredo TOTP cifrado em repouso**: `mfaSecret` e armazenado cifrado; recovery codes sao
  hasheados (uso unico). Reaproveita o padrao de cifra do `crypto.provider`/uma cifra dedicada.
  Alternativa (segredo em texto) descartada por seguranca.
- **`totp.provider` como port**: o dominio depende da interface; a implementacao usa uma biblioteca
  TOTP (ex.: `otplib`). A geracao da imagem do QR fica no frontend a partir da URI `otpauth://`
  retornada — evita acoplar renderizacao de imagem ao backend.
- **`verify-mfa` aceita TOTP ou recovery code**: o mesmo caso de uso cobre o segundo fator do login
  (`009b`) e um eventual gate de recurso sensivel; recovery code e de uso unico.
- **Setup nao habilita**: `setup-mfa` gera segredo em estado nao confirmado; so `confirm-mfa` (com
  o primeiro codigo valido) liga `mfaEnabled` e gera os recovery codes — evita conta travada por
  QR nunca escaneado.
- **Skills**: module-entity, module-use-case, backend-prisma-sync-module,
  backend-prisma-repository, backend-nest-controller.

## Mockups (Claude Design) — inclusão condicional por tela

- Tela desta change **com** mockup do Claude Design → o mockup vive **dentro desta change**, em
  `mockups/<tela>/` (ex.: `mockups/a3-mfa-setup/`). Tela **sem** mockup **não** gera subpasta —
  siga apenas este design.
- Execução: **reproduza fielmente o layout do mockup**, substituindo **todo dado fake/placeholder
  por dado real** vindo do backend — proibido lorem/valor mockado no código final.
- Os códigos de tela citados referem-se a esses mockups; ajuste-os ao seu projeto.

## Risks / Trade-offs

- [Relogio dessincronizado no TOTP] → Janela de tolerancia na verificacao (passos de tempo adjacentes).
- [Perda do dispositivo MFA] → Recovery codes de uso unico; `disable-mfa` por admin pode ser
  previsto na gestao de colaboradores se necessario.
- [Recovery codes vistos uma unica vez] → Exibicao unica com aviso claro na A3; regenerar exige
  novo `confirm` (decisao do projeto).
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
