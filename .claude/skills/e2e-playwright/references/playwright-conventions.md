# Convencoes E2E (Playwright) — inegociaveis

## Seletores
- Use **`data-testid`** sempre. Nada de `getByText`/classe CSS como ancora principal
  (quebra com i18n e refactor de estilo).
- Page Object por tela: encapsula seletores e acoes; o spec le como narrativa.

## Espera
- **Nunca** `page.waitForTimeout()` / sleep fixo.
- Confie no auto-waiting e em web-first assertions: `await expect(locator).toBeVisible()`,
  `await expect(page).toHaveURL(...)`.

## Isolamento
- Cada teste cria seu proprio dado com sufixo unico (ex.: email `e2e+<ts>@test.dev`).
- Sem dependencia de ordem entre specs; sem estado global compartilhado.
- Limpeza: prefira banco/seed de teste resetavel a "limpar na mao".

## Autenticacao
- Faca login uma vez no projeto `setup` e salve `storageState`; os demais projetos reusam.
- Tenha um helper para "logar como <papel>" quando precisar de RBAC.

## Multi-tenant (este projeto)
- Sempre cubra o **negativo**: usuario da org A NAO acessa recurso da org B.
- Confirme que escopo (`organizationId`) e papel vem do token, nunca da UI.

## Estrutura sugerida (apps/e2e)
```
apps/e2e/
  playwright.config.ts
  tests/
    auth.setup.ts          # login -> storageState
    pages/                 # Page Objects (login.page.ts, module.page.ts...)
    flows/                 # specs por jornada (register-login.e2e.ts...)
  .auth/                   # storageState (gitignore)
```

## Gate / CI
- Script `test:e2e` no workspace; ligado ao `turbo` e chamado pelo `scripts/ci/gate.sh`.
- No CI, instalar browsers (`npx playwright install --with-deps chromium`) e subir os apps
  via `webServer` da config (ou job dedicado).
