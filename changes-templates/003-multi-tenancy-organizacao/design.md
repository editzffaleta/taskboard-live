<!-- TEMPLATE — design da multi-tenancy. Placeholders: {{produto}}, {{namespace}}. -->

## Context

O {{produto}} isola dados por organizacao (tenant). A `004` em diante cria modulos cujos dados
pertencem a uma organizacao — comecando pelo proprio `user`, que nasce com `organizationId`. Para
que cada modulo nao reinvente o isolamento, esta mudanca fixa o agregado `organization` e a
convencao de escopo por `organizationId`, alem de semear a organizacao inicial para o sistema ser
operavel desde cedo.

A base de autenticacao (guard global de JWT, `current-user.decorator`, `jwt.strategy`,
`AuthenticatedUser`) ja existe desde a `001`. O `JwtPayload` aceita claims customizadas; portanto o
`organizationId` trafegara como claim quando o login (`005`) emitir o token. Esta mudanca prepara
apenas o dominio, a persistencia, a convencao de escopo e o seed.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Criar o agregado `organization` (entidade validada + contrato) no modulo `tenancy`.
- Persistir `organization` no Prisma e implementar o repositorio.
- Estabelecer a convencao de escopo por `organizationId`, com suporte compartilhado.
- Semear a organizacao inicial (default).

**Non-Goals:**
- Criar usuarios, papeis ou autenticacao — `004`/`005`/`006`.
- Emitir o claim `organizationId` no JWT ou criar `current-organization` — `005`.
- Bootstrap do Super Admin — `006`.
- Casos de uso de gestao de organizacao e UI (plano, cobranca, limites, SSO, branding, metricas,
  seletor de contexto) — `025`.

## Decisions

- **Modulo `tenancy` com agregado `organization`**: agrupa o tenant e, futuramente, conceitos de
  gestao (plano, assinatura) que a `025` adiciona. Alternativa (tabela pura de infraestrutura sem
  agregado) descartada por inconsistencia com o padrao DDD dos demais modulos.
- **Entidade minima nesta fase**: `name`, `slug` (unico) e `status` (`active|inactive|suspended`,
  default `active`). Plano/cobranca/limites/SSO/branding entram na `025` para nao inchar a fundacao.
- **Escopo por `organizationId` como convencao explicita (sem magica de DI)**: repositorios de dados
  de uma organizacao filtram explicitamente por `organizationId`, coerente com o estilo do projeto
  (use-cases chamam repositorios; controllers passam dados). Alternativa (contexto request-scoped via
  DI) descartada por acoplamento implicito.
- **Binding tenant↔sessao adiado para a `005`**: o `organizationId` so faz sentido como claim quando
  ha login emitindo token. A `005` estende `AuthenticatedUser`/mapper para expor `organizationId` e
  adiciona `current-organization.decorator.ts`. A `003` entrega a convencao e o suporte de escopo.
- **Seed apenas da organizacao**: o Super Admin depende de usuario (`004`) e papeis (`006`); seu seed
  entra na `006`, anexado a organizacao default criada aqui. Seeds modulares (`prisma/seed/tasks/*`).

## Risks / Trade-offs

- [Escopo por convencao depende de disciplina dos modulos seguintes] → Documentar a convencao e
  oferecer suporte compartilhado para que filtrar por `organizationId` seja o caminho natural;
  reforcar na revisao de cada modulo.
- [Entidade minima pode parecer incompleta perto das telas de Super Admin] → Intencional: a `025`
  estende `Organization`; a fundacao fica enxuta e estavel.
- [Skill indicada nao cobre o caso inteiro] → Aplicar ate onde fizer sentido e completar manualmente,
  registrando o desvio na evidencia.
