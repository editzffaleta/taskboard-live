<!-- TEMPLATE — design do gating de UI + telas de grupos. Placeholders: {{produto}}, {{namespace}}. -->

## Context

A `006a` entregou o mecanismo: catalogo compartilhado, grupos org-scoped, efetivas, guards e
`GET /me/permissions`. A `002` entregou a sidebar por secoes com config estatica. Esta mudanca liga
os dois: o frontend passa a conhecer as permissoes do usuario e a UI se molda a elas; o Admin da
Organizacao ganha as telas de gestao (D7/D8/D9).

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Efetivas do usuario disponiveis no client (pos-login e sob demanda).
- Sidebar e rotas privadas com gating por papel/permissao, reutilizando a estrutura da `002`.
- Telas D7/D8/D9 completas, cabeadas nos endpoints da `006a`.

**Non-Goals:**
- Qualquer codigo novo no backend — endpoints e guards ja existem (`006a`).
- Autorizacao "de verdade" no client — o gating de UI e conveniencia; quem nega e o backend (403).
- Telas de colaboradores (D2/D3/D29) — sao a familia `008*`.

## Decisions

- **Fonte das efetivas = `GET /me/permissions`** na hidratacao da sessao (apos o `AuthContext` da
  `005` autenticar), com rebusca sob demanda (ex.: apos salvar atribuicao na D9). Nao inflar o JWT.
- **Gating declarativo na config da sidebar**: cada secao/item ganha `roles?: Role[]` e
  `permissions?: PermissionKey[]`; a sidebar filtra com a funcao de efetivas do pacote compartilhado
  (`006a`/1.2). Sem reescrever a estrutura da `002`.
- **Protecao de rota como extensao do `AuthGuard`** (`005`) ou `RoleGuard` dedicado: nao autorizado →
  redirect para a rota privada inicial (neutra). O 403 real continua vindo do backend.
- **D8 le o catalogo do pacote compartilhado** e agrupa as permissoes por modulo (metadados
  rotulo/modulo); nada hardcoded na tela.
- **Componentes da `002`**: D7 usa a tabela paginada padrao; D8 usa `form-section-layout` +
  `delete-confirmation-dialog` (respeitando `isSystem`); D9 usa multi-select padrao.
- **Skills**: frontend-next-config (padroes de tela/rota) e config-new-module (estrutura do modulo
  no frontend, se ainda nao existir).

## Mockups (Claude Design) — inclusão condicional por tela

- Tela desta change **com** mockup do Claude Design → o mockup vive **dentro desta change**, em
  `mockups/<tela>/` (ex.: `mockups/d7-grupos/`, `mockups/d8-editor/`). Tela **sem** mockup **não**
  gera subpasta — siga apenas este design.
- Execução: **reproduza fielmente o layout do mockup**, substituindo **todo dado fake/placeholder
  por dado real** vindo do backend — proibido lorem/valor mockado no código final.
- Os códigos de tela citados (D7/D8/D9) referem-se a esses mockups; ajuste-os ao seu projeto.

## Risks / Trade-offs

- [Efetivas obsoletas no client] → Rebusca de `GET /me/permissions` quando necessario; o gating e
  conveniencia, a autorizacao real e no backend.
- [Divergencia UI × backend] → Ambos usam a MESMA funcao de efetivas e o MESMO catalogo do pacote
  compartilhado; teste ponta a ponta na verificacao.
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
