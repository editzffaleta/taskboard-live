<!-- TEMPLATE — tasks da auditoria de acoes. Checkboxes vazios; marque com evidencia. Cada task tem
**Aceite**. Placeholders: {{produto}}, {{namespace}}. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `004`, `006a` (papeis/guards). Pontos condicionais: `008a`/`008b`/`008c`,
> `009a`/`009c`, `013` **apenas se aplicadas**. **Nao faca:** tela de auditoria; auditoria de
> leitura; update/delete de entradas; retencao/expurgo; registrar senha/segredo/token/recovery em
> metadata. **Principio:** auditar nunca derruba a acao auditada.

## 1. Dominio (novo modulo audit)

- [ ] 1.1 Criar o modulo `audit` (skill [config-new-module](../../../.claude/skills/config-new-module)) com o agregado `audit-entry` (skill [module-aggregate](../../../.claude/skills/module-aggregate)): `actorId`, `action` (chave estavel), `targetType`, `targetId`, `organizationId`, `metadata` (JSON), `requestId?`, `createdAt`.
  - **Aceite:** modulo e agregado criados; catalogo inicial de `action` documentado no modulo.
- [ ] 1.2 Contrato do repositorio **append-only** (skill [module-repository](../../../.claude/skills/module-repository)): apenas `create` e `findPage` (filtros: `action`, `actorId`, `targetId`, periodo; sempre por organizacao).
  - **Aceite:** contrato sem update/delete; fake para testes disponivel.
- [ ] 1.3 Caso de uso `record-audit-entry` (skill [module-use-case](../../../.claude/skills/module-use-case)) tolerante a falha (try/catch + log de erro) e com bloqueio de metadata proibida (senha/segredo/token/recovery).
  - **Aceite:** falha do repositorio nao propaga; metadata proibida e rejeitada/limpa; testes cobrem ambos.

## 2. Back-end

- [ ] 2.1 Sincronizar o Prisma (skill [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module)): model `audit_entry` com indices (organizacao+data, acao) e repositorio Prisma (skill [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository)).
  - **Aceite:** migration aplicada; indices presentes; repositorio implementa o contrato.
- [ ] 2.2 Integrar o registro nos pontos presentes: mudanca de papel/grupo (`006a`/`008a`); `approve-user`/`reject-user` (`008b`); criacao/revogacao de convite (`008c`); `disable-mfa` (`009a`); `reset-password` concluido e `set-initial-password` (`009c`). Incluir `requestId` quando a `013` estiver aplicada.
  - **Aceite:** cada acao presente gera a entrada com actor/alvo/metadata segura; changes ausentes nao sao referenciadas.
- [ ] 2.3 Criar `GET /audit` no `audit.controller.ts`: paginado, filtros por `action`/`actorId`/`targetId`/periodo, `@Roles('admin_org','super_admin')`, escopo pela organizacao do admin (`super_admin` sem filtro).
  - **Aceite:** admin_org so ve a propria organizacao; papel nao autorizado recebe 403; paginacao e filtros funcionando.
- [ ] 2.4 Testes de integracao: acao sensivel gera entrada consultavel; falha do audit nao quebra a acao; metadata proibida nunca persiste.
  - **Aceite:** cenarios cobertos; suite verde.

## 3. Verificacao

- [ ] 3.1 Rodar `npx tsc --noEmit` (backend), os testes e validar manualmente: aprovar um pendente (se `008b`) e trocar um papel → consultar as entradas via `GET /audit` como admin_org e como super_admin.
  - **Aceite:** `tsc` limpo; testes verdes; trilha conferida por consulta.
