<!-- TEMPLATE — tasks dos seeds de desenvolvimento. Checkboxes vazios; marque com evidencia. Cada
task tem **Aceite**. Placeholders: {{produto}}, {{namespace}}. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `004`, `006a` (papeis + seed do super admin). Blocos condicionais: `003`,
> `007`, `008a` **apenas se aplicadas**. **Nao faca:** faker/massa volumosa; seed de dominio do
> produto; delete+insert (so upsert); rodar em producao sem `SEED_DEMO=true`.

## 1. Back-end

- [ ] 1.1 Criar `apps/backend/prisma/seed.ts` com o guard de ambiente (producao exige `SEED_DEMO=true`, senao aborta com mensagem) e registrar em `prisma.seed` no package + script npm `db:seed:demo`.
  - **Aceite:** `npm run db:seed:demo` roda em dev; em `NODE_ENV=production` sem a flag, aborta.
- [ ] 1.2 Semear (upsert por chave natural) a organizacao demo "{{produto}} Demo" e os usuarios `colaborador@demo.dev`, `lider@demo.dev`, `admin@demo.dev` (papel `admin_org`), todos `active`, senha `Demo@12345` hasheada pelo `crypto.provider`.
  - **Aceite:** login funciona com cada credencial; rodar 2x nao duplica (contagens estaveis).
- [ ] 1.3 **Se `006a`:** semear um grupo de permissao demo (subconjunto do catalogo) vinculado ao lider. **Se `007`:** semear unidade/setor/cargo demo e vincular os usuarios. **Se `008a`:** semear `pendente@demo.dev` com status `pending`.
  - **Aceite:** blocos executam apenas com os models presentes; vinculos consultaveis via API.
- [ ] 1.4 Testes: idempotencia (2 execucoes → mesmas contagens) e guard de producao.
  - **Aceite:** cenarios cobertos; suite verde.
- [ ] 1.5 Documentar as credenciais demo e o comando no README do projeto gerado (secao "Ambiente de desenvolvimento").
  - **Aceite:** README atualizado; nenhuma credencial demo citada como de producao.

## 2. Verificacao

- [ ] 2.1 Rodar `npx tsc --noEmit` (backend), os testes, executar o seed 2x e validar manualmente: login com os 3 papeis, telas navegaveis com dados demo, fila D29 com o pendente (se `008a`/`008b`).
  - **Aceite:** `tsc` limpo; testes verdes; navegacao validada por papel.
