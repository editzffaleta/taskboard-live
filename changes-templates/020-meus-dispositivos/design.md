<!-- TEMPLATE — design do meus dispositivos (B10). Placeholders: {{produto}}, {{namespace}}. -->

## Context

A `017` deixou tudo pronto no lado difícil (familias, rotacao, revogacao); falta o usuario ver e
agir. Esta change adiciona metadados minimos, tres endpoints de autosservico e a tela — sem
mexer no mecanismo de rotacao.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Listar as familias ativas do proprio usuario com dispositivo, criacao, ultimo uso e a atual.
- Revogar uma familia especifica ou todas as outras, com efeito imediato.
- Metadados capturados sem fingerprinting invasivo (so user-agent e timestamps).

**Non-Goals:**
- Geolocalizacao por IP e fingerprinting de dispositivo — decisao de privacidade; fora.
- Gestao por admin das sessoes de terceiros — futura, sobre os mesmos use cases.
- Notificacao de "novo login detectado" — combina com a `011` numa change futura.

## Decisions

- **Familia = sessao/dispositivo**: a lista exibe uma linha por `familyId` ativa; e a granularidade
  natural da `017` (um login = uma familia).
- **Sessao atual identificada pelo refresh do cookie**: o `GET /me/sessions` compara o hash do
  cookie recebido com o elo ativo de cada familia para marcar a atual — sem estado extra.
- **`revoke-others` no servidor** (nao N chamadas do cliente): operacao atomica que revoga todas
  as familias do usuario exceto a atual.
- **User-agent resumido na exibicao**: o valor bruto fica no banco; a UI resume (navegador + SO)
  com util simples, sem biblioteca de parsing pesada.
- **Migration aditiva**: campos novos opcionais — familias pre-existentes aparecem como
  "dispositivo desconhecido" ate a proxima rotacao preencher.
- **Skills**: module-use-case, backend-prisma-sync-module, backend-prisma-repository,
  backend-nest-controller; frontend sobre a base da `010`.

## Mockups (Claude Design) — inclusão condicional por tela

- Tela desta change **com** mockup do Claude Design → o mockup vive **dentro desta change**, em
  `mockups/<tela>/` (ex.: `mockups/b10-meus-dispositivos/`). Tela **sem** mockup **não** gera
  subpasta — siga apenas este design.
- Execução: **reproduza fielmente o layout do mockup**, substituindo **todo dado fake/placeholder
  por dado real** vindo do backend — proibido lorem/valor mockado no código final.
- O código de tela citado (B10) é sugestão; ajuste-o ao seu projeto.

## Risks / Trade-offs

- [Revogar a sessao atual sem querer] → Badge "sessao atual" + confirmacao; revogar a atual vira
  logout limpo (comportamento documentado na tela).
- [User-agent mentiroso] → Metadado informativo, nunca base de autorizacao; a revogacao vale
  pela familia, nao pelo agente.
- [Corrida entre rotacao e listagem] → Lista e snapshot; acoes usam `familyId` (estavel na
  rotacao), entao revogar funciona mesmo com o elo rotacionado no meio.
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
