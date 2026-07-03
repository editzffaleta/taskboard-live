<!-- TEMPLATE — design da sessao rotativa. Placeholders: {{produto}}, {{namespace}}. -->

## Context

A `005` alinhou token e cookie em 7 dias — simples, mas sem revogacao e com janela longa de
roubo. O padrao de mercado (refresh rotativo com deteccao de reuso) entra aqui **sem mudar o
dominio do login**: `login-user` segue validando credencial+status; emissao e rotacao sao da
camada HTTP + um agregado novo de sessao.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Janela de roubo do access reduzida a minutos; refresh de uso unico com familia por dispositivo.
- Reuso de refresh = familia inteira revogada (resposta padrao a token theft).
- Logout e revogacao reais; renovacao transparente no cliente (interceptor).

**Non-Goals:**
- Tela "meus dispositivos"/revogacao seletiva pela UI — futura, sobre as familias.
- Mudar o armazenamento do access no cliente (segue o padrao da `005`, agora curto).
- SSO/OAuth de terceiros.

## Decisions

- **Refresh opaco hasheado, nunca JWT**: valor aleatorio de alta entropia; no banco so o hash —
  vazamento de banco nao vaza sessao. Comparacao por hash no `rotate`.
- **Cookie httpOnly com path `/auth/refresh`**: o JS nunca le o refresh; o cookie so viaja para o
  endpoint de renovacao (e logout). CORS com credenciais ja coberto (`012`, se aplicada; senao,
  configurar no CORS da `001`).
- **Familia por login**: cada login cria `familyId`; cada rotacao encadeia (`replacedByHash`).
  Reuso de um elo ja substituido/revogado → `revoke-family` + 401. E o trade-off classico:
  sessao legitima cai junto num roubo detectado — preferivel a manter o ladrao dentro.
- **Access continua como na `005` (agora 15 min)**: evita reescrever guard/client; o interceptor
  cobre a renovacao. TTLs por env (`ACCESS_TOKEN_TTL=15m`, `REFRESH_TOKEN_TTL=7d`).
- **Interacao com `009b`**: com MFA, o par so e emitido em `POST /auth/login/mfa` (apos o segundo
  fator); a primeira etapa continua emitindo apenas o desafio.
- **Skills**: module-aggregate, module-repository, module-use-case,
  backend-prisma-sync-module, backend-prisma-repository, backend-nest-controller.

## Risks / Trade-offs

- [Requisicoes concorrentes no refresh] → O interceptor serializa a renovacao (uma por vez;
  demais aguardam o novo access). Rotacao no servidor e atomica (transacao).
- [Familia revogada derrubar usuario legitimo] → Comportamento desejado na deteccao de reuso;
  o usuario reloga (custo aceitavel vs sessao roubada ativa).
- [Relogio/TTL mal configurado] → TTLs por env com defaults seguros e validados no boot.
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
