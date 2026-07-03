<!--
TEMPLATE DE CHANGE — 016-audit-log (trilha imutavel de acoes sensiveis + consulta admin).
Extensao transversal (opcional; recomendada onde ha compliance). Sem tela nesta fase.
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: {{produto}} (ex.: AlphaBet), {{namespace}} (ex.: alphabet) → @{{namespace}}
-->

> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/auditoria-de-acoes/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`) · e, **somente se o `design.md` citar
> nominalmente**: arquivos de código listados, `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

Quem aprovou aquele colaborador? Quem trocou o papel do usuario? Quem desativou o MFA? Hoje a
resposta e "ninguem sabe". Esta mudanca cria a **trilha de auditoria imutavel** das acoes
sensiveis — requisito basico de operacao seria e de qualquer compliance — com consulta paginada
para admins, escopada por organizacao.

## What Changes

- **Agregado `audit-entry`** (modulo `audit`): `actorId`, `action` (chave estavel, ex.:
  `user.role_changed`), `targetType`/`targetId`, `organizationId`, `metadata` (JSON com
  antes/depois quando fizer sentido — **sem** dados sensiveis), `requestId?`, `createdAt`.
  **Append-only**: o contrato do repositorio nao tem update nem delete.
- **Servico de registro** (`record-audit-entry`) tolerante a falha: erro ao auditar e logado e
  nao derruba a acao de negocio.
- **Pontos auditados (condicionais a presenca)**: mudanca de papel e vinculo de grupo
  (`006a`/`008a`); aprovacao/rejeicao (`008b`); criacao/revogacao de convite (`008c`);
  disable de MFA (`009a`); reset de senha concluido e primeiro acesso (`009c`).
- **Consulta admin**: `GET /audit` paginado com filtros (`action`, `actorId`, `targetId`,
  periodo), `@Roles('admin_org','super_admin')`, escopado a organizacao do admin
  (`super_admin` enxerga todas). Sem tela nesta fase — UI de auditoria e change de produto futura.
- **Migration** do model `audit_entry` (indices por organizacao/data/acao) + repositorio.

## Capabilities

### New Capabilities
- `auditoria-de-acoes`: trilha imutavel (append-only) das acoes sensiveis do {{produto}} com
  ator, alvo, organizacao, metadata segura e consulta paginada para administradores.

### Modified Capabilities
<!-- Nenhuma reescrita: os casos de uso existentes ganham o registro como efeito colateral. -->

## Impact

- **Dominio**: novo modulo `audit` (agregado + contrato + `record-audit-entry` + testes); casos
  de uso sensiveis presentes chamam o registro como efeito tolerante a falha.
- **Backend**: migration `audit_entry`; repositorio append-only; `audit.controller` com a
  consulta paginada autorizada; integracao do `requestId` (se `013` aplicada).
- **Frontend**: nenhum nesta fase.
- **Dependencias**: `004` (user), `006a` (papeis/guards). Condicionais: `008a`/`008b`/`008c`,
  `009a`/`009c`, `013` (requestId).
- **Habilita**: investigacao de incidentes, prestacao de contas e uma futura tela de auditoria.
