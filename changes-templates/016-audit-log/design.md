<!-- TEMPLATE — design da auditoria de acoes. Placeholders: {{produto}}, {{namespace}}. -->

## Context

As acoes administrativas do nucleo (papeis, aprovacoes, convites, MFA, resets) mudam o acesso de
pessoas e hoje nao deixam rastro. A trilha entra como modulo proprio (`audit`), consumida pelos
casos de uso existentes como efeito colateral — sem mudar contratos de negocio.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Registro imutavel (append-only) com ator, acao estavel, alvo, organizacao e metadata segura.
- Consulta paginada e filtravel para admins, escopada por organizacao.
- Registro tolerante a falha: auditar nunca derruba a acao auditada.

**Non-Goals:**
- Tela de auditoria — change de produto futura sobre o `GET /audit`.
- Auditoria de leitura (quem viu o que) e de todas as rotas — so acoes sensiveis de escrita.
- Retencao/expurgo automatico e exportacao — politicas de change futura.
- Assinatura criptografica/encadeamento de hash — alem do necessario nesta fase.

## Decisions

- **Append-only por contrato**: o repositorio expoe `create`/`findPage` — sem update/delete; a
  imutabilidade e garantida na camada de contrato, nao por convencao.
- **Acoes como chaves estaveis** (`user.role_changed`, `user.approved`, `mfa.disabled`,
  `invitation.created`…): filtraveis, i18n na exibicao futura; catalogo documentado no modulo.
- **Metadata segura**: JSON com o minimo util (ex.: papel anterior → novo); **nunca** senha,
  segredo, token ou recovery code — mesma lista de redaction da `013`.
- **Efeito tolerante a falha**: `record-audit-entry` em try/catch com log de erro; a acao de
  negocio conclui mesmo com a auditoria fora do ar (disponibilidade > completude da trilha).
- **Escopo por organizacao**: cada entrada carrega `organizationId`; a consulta do `admin_org` e
  filtrada pela propria organizacao (padrao do multi-tenant `003`), `super_admin` ve todas.
- **Skills**: config-new-module (modulo audit), module-aggregate, module-repository,
  module-use-case, backend-prisma-sync-module, backend-prisma-repository, backend-nest-controller.

## Risks / Trade-offs

- [Crescimento da tabela] → Indices por (organizacao, data) e (acao); retencao/expurgo entram em
  change propria quando o volume exigir.
- [Metadata vazar sensivel] → Lista proibida testada (senha/segredo/token/recovery) no registro.
- [Trilha incompleta em falha do audit] → Decisao explicita (tolerante a falha) + erro logado com
  request-id para reconciliacao manual.
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
