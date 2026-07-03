<!-- TEMPLATE — tasks da fundacao e2e. Checkboxes vazios; marque com evidencia. Cada task tem
**Aceite**. Placeholders: {{produto}}, {{namespace}}. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `005` (login), `014` (seed demo aplicado). Condicional: `009b` (cenario MFA).
> **Nao faca:** e2e das telas do nucleo (vem por change, com a skill
> [e2e-playwright](../../../.claude/skills/e2e-playwright)); e2e no ci.yml padrao; cross-browser.

## 1. Fundacao

- [ ] 1.1 Instalar `@playwright/test` na raiz (`npm i -D @playwright/test` + `npx playwright install chromium`) e criar `playwright.config.ts` (skill [e2e-playwright](../../../.claude/skills/e2e-playwright)): `testDir: 'e2e'`, `baseURL` de `E2E_BASE_URL` (default `http://localhost:3000`), projeto chromium, trace/screenshot em falha.
  - **Aceite:** `npx playwright test --list` enxerga o diretorio sem erro; config usa a env.
- [ ] 1.2 Criar `e2e/helpers/auth.ts` com `loginAs(page, papel)` usando as credenciais do seed demo (`014`) e checagem de pre-condicao (`E2E_BASE_URL` responde; senao, falha rapida com mensagem "suba os apps: npm run dev").
  - **Aceite:** helper loga como colaborador/lider/admin; pre-condicao falha com instrucao clara.
- [ ] 1.3 Criar `e2e/smoke-login.spec.ts`: credencial valida → shell autenticado; invalida → mensagem i18n de erro; logout → area publica. **Se `009b`:** usuario com MFA cai na verificacao (A2) apos as credenciais.
  - **Aceite:** smoke verde local com apps de pe e seed aplicado; cenario MFA presente apenas com a `009b`.
- [ ] 1.4 Adicionar o script `test:e2e` na raiz (`playwright test`) e `E2E_BASE_URL` ao `.env.example`; incluir no `ci.yml` do projeto um bloco **comentado** com instrucoes para ligar o e2e quando houver ambiente com servicos.
  - **Aceite:** `npm run test:e2e` roda o smoke; ci.yml com o bloco comentado e instruido.

## 2. Verificacao

- [ ] 2.1 Rodar `npx tsc --noEmit`, subir os apps, aplicar o seed e executar `npm run test:e2e`; conferir trace/screenshot gerados numa falha proposital.
  - **Aceite:** smoke verde; artefatos de falha funcionando; execucao registrada na evidencia.
