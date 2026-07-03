<!-- TEMPLATE — design do login em duas etapas. Placeholders: {{produto}}, {{namespace}}. -->

## Context

O `login-user` (`005`) valida credenciais + status e o controller emite o JWT; o mecanismo de MFA
(`009a`) sabe verificar um codigo TOTP/recovery. Esta mudanca liga os dois na **camada HTTP**: com
`mfaEnabled`, o login devolve um desafio e uma segunda chamada troca desafio+codigo pelo JWT.

Principio mantido: o dominio nao conhece token/JWT — nem o de sessao, nem o de desafio. O
`challengeToken` e um artefato exclusivo do controller.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Exigir o segundo fator no login quando `mfaEnabled`, sem emitir o JWT antes da verificacao.
- Manter o login direto (`{ token, user }`) para quem nao tem MFA.
- Tela A2 (verificacao do codigo no login, aceitando TOTP ou recovery code).

**Non-Goals:**
- Mecanismo de MFA (setup/confirm/verify/disable) — e a `009a`.
- Recuperacao de senha e primeiro acesso — sao a `009c`.
- "Lembrar este dispositivo"/dispositivos confiaveis — fora desta fase.
- Alterar `login-user` no dominio — a decisao de exigir o fator e do controller.

## Decisions

- **Login em duas etapas so quando ha MFA**: `login-user` (`005`) permanece credencial+status; o
  controller decide. Sem MFA → resposta atual `{ token, user }`. Com MFA → `{ mfaRequired: true,
  challengeToken }` (token curto assinado que identifica o usuario e expira em minutos), e
  `POST /auth/login/mfa` valida desafio + codigo via `verify-mfa` e emite o JWT. Alternativa
  (emitir o JWT e exigir MFA depois) descartada por expor sessao antes do segundo fator.
- **Desafio nao e sessao**: o `challengeToken` so serve para a segunda etapa do login (claim de
  proposito distinta do JWT de sessao) e expira rapido; reutiliza-lo em rotas autenticadas falha.
- **A2 aceita TOTP ou recovery code**: espelha o `verify-mfa` (`009a`); recovery e de uso unico.
- **Skills**: backend-nest-controller (endpoints), spec-frontend-auth como referencia do fluxo de
  login existente no cliente.

## Mockups (Claude Design) — inclusão condicional por tela

- Tela desta change **com** mockup do Claude Design → o mockup vive **dentro desta change**, em
  `mockups/<tela>/` (ex.: `mockups/a2-mfa-login/`). Tela **sem** mockup **não** gera subpasta —
  siga apenas este design.
- Execução: **reproduza fielmente o layout do mockup**, substituindo **todo dado fake/placeholder
  por dado real** vindo do backend — proibido lorem/valor mockado no código final.
- Os códigos de tela citados referem-se a esses mockups; ajuste-os ao seu projeto.

## Risks / Trade-offs

- [Desafio vazado/interceptado] → `challengeToken` curto, assinado, com expiracao em minutos e
  proposito exclusivo (nao autentica rota nenhuma).
- [Usuario sem o dispositivo na mao] → A2 aceita recovery code (uso unico, da `009a`).
- [Forca bruta no segundo fator] → expiracao curta do desafio limita a janela; um rate limit
  dedicado pode ser adicionado como hardening futuro (fora do escopo).
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
