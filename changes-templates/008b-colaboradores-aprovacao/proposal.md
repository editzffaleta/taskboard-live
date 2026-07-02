<!--
TEMPLATE DE CHANGE — 008b-colaboradores-aprovacao (fluxo pending → active/inactive + tela D29).
Split da antiga 008 (densa): CRUD/wizard na 008a; convites na 008c.
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: {{produto}} (ex.: AlphaBet), {{namespace}} (ex.: alphabet) → @{{namespace}}
Codigo de tela (D29) refere-se ao seu mockup; ajuste-o.
-->

> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/cadastro-colaboradores/spec.md` (se existir) · esta
> change (`proposal.md`, `design.md`, `tasks.md`, `specs/`, `mockups/` se houver) · e,
> **somente se o `design.md` citar nominalmente**: arquivos de código listados,
> `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

Colaboradores criados fora do wizard (auto-cadastro pelo `/join` da `004` e, em breve, pelo convite
da `008c`) nascem `pending` — e hoje ninguem os ativa. O gate de status do login (`005`) ja barra
quem nao esta `active`. Esta mudanca fecha o ciclo: o admin **aprova** (`pending → active`) ou
**rejeita** (`pending → inactive`) pela fila **D29**, com transicao validada no dominio.

## What Changes

- Casos de uso `approve-user` (`pending → active`) e `reject-user` (`pending → inactive`); fora de
  `pending` → `DomainError('user.invalid_status_transition', 409)`.
- Endpoints `POST /users/:id/approve`, `POST /users/:id/reject` e listagem filtrada de pendentes —
  sob `@Roles('admin_org','super_admin')` (`006a`), escopados por organizacao.
- **D29 — fila de aprovacao**: lista de `pending` com aprovar/rejeitar; item de menu sob gating; i18n.

## Capabilities

### New Capabilities
<!-- Nenhuma. Esta mudanca completa a capability criada pela 008a. -->

### Modified Capabilities
- `cadastro-colaboradores` (`008a`): a capability ganha o fluxo de aprovacao/rejeicao com transicao
  validada, endpoints dedicados e a tela D29.

## Impact

- **Dominio (`modules/auth`)**: `approve-user`/`reject-user` + testes (transicao invalida coberta).
- **Backend**: `UserController` ampliado (approve/reject + filtro de pendentes); integracao HTTP.
- **Frontend**: tela D29 no modulo `auth`; item de menu sob gating; chaves i18n.
- **Dependencias**: `008a` (listagem/leitura mapeada), `004` (`status`), `005` (gate de login),
  `006a`/`006b` (autorizacao/gating).
- **Habilita**: `008c` (o aceite de convite gera `pending` que esta fila ativa).
