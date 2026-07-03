<!-- TEMPLATE — design da tela de auditoria (D30). Placeholders: {{produto}}, {{namespace}}. -->

## Context

O `GET /audit` (`016`) ja pagina, filtra e escopa por organizacao. Esta change e a camada de
apresentacao: nenhum requisito novo de backend, nenhuma permissao nova — so tornar a trilha
utilizavel por humanos.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Tabela paginada com filtros (acao/ator/alvo/periodo) espelhando os parametros da API.
- Detalhe da metadata legivel (JSON formatado) + requestId quando existir.
- Rotulos i18n por chave de acao, com fallback no literal.

**Non-Goals:**
- Exportacao (CSV) e retencao/expurgo — changes futuras.
- Novos filtros/agregacoes no backend — se a UI precisar, e change na `016`, nao aqui.
- Auditoria em tempo real (websocket) — paginacao com refresh manual basta.

## Decisions

- **Cliente puro da API**: a tela usa exatamente os parametros do `GET /audit`; sem endpoint
  proprio. Se um filtro nao existir na API, ele nao existe na tela.
- **Catalogo de rotulos por chave estavel**: dicionario i18n `audit.actions.<chave>`; chave fora
  do catalogo exibe o literal — a trilha nunca quebra por acao nova.
- **Metadata como JSON legivel** (chave→valor formatado) num painel expandivel por linha; nada de
  interpretar semanticamente o conteudo (varia por acao).
- **Gating igual ao das telas D7/D8/D9** (`006b`): menu condicional + guarda de rota; o backend
  continua sendo a autoridade (403 para nao autorizado).
- **Skills**: frontend-next-config (base de rotas), spec-frontend-auth (cliente HTTP autenticado).

## Mockups (Claude Design) — inclusão condicional por tela

- Tela desta change **com** mockup do Claude Design → o mockup vive **dentro desta change**, em
  `mockups/<tela>/` (ex.: `mockups/d30-auditoria/`). Tela **sem** mockup **não** gera subpasta —
  siga apenas este design.
- Execução: **reproduza fielmente o layout do mockup**, substituindo **todo dado fake/placeholder
  por dado real** vindo do backend — proibido lorem/valor mockado no código final.
- O código de tela citado (D30) é sugestão; ajuste-o ao seu projeto.

## Risks / Trade-offs

- [Metadata grande poluir a tabela] → Detalhe expandivel por linha; a tabela mostra so o resumo.
- [Catalogo de rotulos desatualizar] → Fallback no literal garante exibicao; atualizar o
  dicionario vira tarefa de rotina das changes que criam acoes novas.
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
