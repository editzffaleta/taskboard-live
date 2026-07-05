> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `009` (quadro ao vivo), `010` (compartilhamento e membros), `004`
> (login/sessao), `005` (quadros CRUD). **Nao faca:** e2e exaustivo das telas do nucleo (vem por
> change, com a skill [e2e-playwright](../../../.claude/skills/e2e-playwright)); e2e no ci.yml
> padrao; cross-browser; MFA/recuperacao/convite — este projeto nao os tem.

## 1. Fundacao

- [ ] 1.1 Instalar `@playwright/test` na raiz (`npm i -D @playwright/test` + `npx playwright install chromium`) e criar `playwright.config.ts` (skill [e2e-playwright](../../../.claude/skills/e2e-playwright)): `testDir: 'e2e'`, `baseURL` de `E2E_BASE_URL` (default `http://localhost:3000`), projeto chromium, trace/screenshot em falha.
  - **Aceite:** `npx playwright test --list` enxerga o diretorio sem erro; config usa a env.
- [ ] 1.2 Criar `e2e/helpers/auth.ts` com `registrarELogar(page)`: gera nome/email unicos por execucao, chama o fluxo de registro (`POST /auth/register` ou UI) e login (`POST /auth/login` ou UI); checagem de pre-condicao (`E2E_BASE_URL` responde; senao, falha rapida com mensagem "suba os apps: npm run dev").
  - **Aceite:** helper retorna uma sessao autenticada valida; pre-condicao falha com instrucao clara.
- [ ] 1.3 Criar `e2e/helpers/board.ts` com `criarQuadro(page, nome)` e `adicionarMembro(page, quadroId, emailDoMembro)`, reaproveitando as telas/rotas de `005` e `010`.
  - **Aceite:** helper cria um quadro visivel no dashboard e adiciona um segundo usuario como membro dele.
- [ ] 1.4 Criar `e2e/smoke-auth.spec.ts`: registro → login → chega ao dashboard; login invalido → mensagem de erro i18n, nenhuma sessao criada; logout → volta a area publica.
  - **Aceite:** os tres cenarios passam localmente com os apps de pe.
- [ ] 1.5 Criar `e2e/colaboracao-ao-vivo.spec.ts` (spec vitrine): dois `BrowserContext` isolados — usuario A (dono, cria o quadro) e usuario B (adicionado como membro pelo helper de `1.3`) — ambos abrem o mesmo quadro; A move um cartao de uma coluna para outra; assert que a aba de B mostra o cartao na nova coluna, **sem reload**, dentro de um timeout curto e documentado no proprio spec.
  - **Aceite:** o spec passa localmente com apps de pe e banco disponivel; comentario no topo do arquivo documenta a pre-condicao (`npm run dev` + banco).
  - **Guardrail:** nao usar `page.waitForTimeout` fixo para a assercao — usar `expect(...).toBeVisible({ timeout })` ou equivalente orientado a evento.
- [ ] 1.6 Adicionar o script `test:e2e` na raiz (`playwright test`) e `E2E_BASE_URL` ao `.env.example`; incluir no `ci.yml` do projeto um bloco **comentado** com instrucoes para ligar o e2e quando houver ambiente com servicos (DB + apps de pe).
  - **Aceite:** `npm run test:e2e` roda os dois specs; `ci.yml` com o bloco comentado e instruido.

## 2. Verificacao

- [ ] 2.1 Rodar `npx tsc --noEmit`, subir os apps (`npm run dev`) com banco disponivel e executar `npm run test:e2e`; conferir trace/screenshot gerados numa falha proposital.
  - **Aceite:** smoke de auth e spec vitrine verdes; artefatos de falha funcionando; execucao registrada na evidencia.
