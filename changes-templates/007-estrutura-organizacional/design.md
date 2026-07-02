<!-- TEMPLATE — design da estrutura organizacional. Placeholders: {{produto}}, {{namespace}}. -->

## Context

O cadastro de colaboradores (`008`) posiciona cada pessoa na estrutura da empresa. Esta mudanca
entrega os tres dados de referencia org-scoped — setor, cargo e unidade/filial — geridos pelo Admin
da Organizacao (telas D4/D5/D6). E a primeira aplicacao do padrao de CRUD de referencia do projeto,
replicado para tres agregados paralelos.

Esses metadados sao independentes do RBAC: `sector`/`position`/`unit` descrevem onde a pessoa esta na
organizacao; `role` e grupos de permissao (`006`) descrevem o que ela pode fazer.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Tres agregados org-scoped (`sector`, `position`, `unit`) com CRUD completo e testes.
- Persistencia com nome unico por organizacao.
- CRUD autorizado por papel (`admin_org`/`super_admin`).
- Telas D4/D5/D6 reusando os componentes da `002`.

**Non-Goals:**
- Vincular colaboradores a setor/cargo/unidade — e a `008` (aqui apenas os cadastros de referencia existem).
- Hierarquia entre setores/unidades (sub-setores, matriz/filial aninhada) — fora do escopo.
- Relatorios por estrutura — `021`.

## Decisions

- **Modulo `org-structure` dedicado**: agrupa os tres agregados, separando-os do `tenancy` (que trata
  o tenant e, na `025`, plano/cobranca). Alternativa (colocar em `tenancy`) descartada para nao
  misturar estrutura voltada ao colaborador com gestao de plataforma.
- **Tres agregados paralelos e simetricos**: compartilham a mesma forma (`organizationId`, `name`
  unico por org, `description?`, `active`); `unit` adiciona `code?`. A simetria simplifica
  controllers, telas e testes. Campos adicionais ficam para quando houver necessidade comprovada.
- **`active` em vez de exclusao dura quando referenciado**: a flag permite desativar um item sem
  quebrar colaboradores ja vinculados (relevante a partir da `008`). A exclusao dura segue disponivel
  para itens nao referenciados; o tratamento de exclusao de item em uso e refinado na `008`.
- **Autorizacao por papel (nao por permissao granular)**: dados de referencia raramente sao
  delegados; `@Roles('admin_org','super_admin')` e coerente com o padrao da `006` para CRUD
  administrativo. Uma permissao `org-structure.manage` pode ser adicionada ao catalogo depois.
- **Skills**: config-new-module, module-aggregate, module-entity, module-repository, module-use-case,
  backend-prisma-sync-module, backend-prisma-repository, backend-nest-controller.

## Mockups (Claude Design) — inclusão condicional por tela

- Tela desta change **com** mockup do Claude Design → o mockup vive **dentro desta change**, em
  `mockups/<tela>/` (ex.: `mockups/d4-estrutura/`). Tela **sem** mockup **não** gera subpasta — siga
  apenas este design.
- Execução: **reproduza fielmente o layout do mockup**, substituindo **todo dado fake/placeholder
  por dado real** vindo do backend — proibido lorem/valor mockado no código final.
- Os códigos de tela citados referem-se a esses mockups; ajuste-os ao seu projeto.

## Risks / Trade-offs

- [Tres CRUDs quase identicos podem inflar a mudanca] → A simetria e intencional; as tasks tratam os
  tres em paralelo para evitar repeticao e manter consistencia.
- [Exclusao de item em uso por colaborador] → Mitigado pela flag `active`; o bloqueio/aviso de
  exclusao de item referenciado e detalhado na `008`.
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
