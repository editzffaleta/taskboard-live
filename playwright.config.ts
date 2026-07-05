// playwright.config.ts — fundacao e2e do TaskBoard Live (change 013-fundacao-e2e).
//
// Pre-condicao (decisao registrada em design.md): NAO orquestramos os apps via `webServer`
// aqui. Suba o backend e o frontend antes de rodar `npm run test:e2e`:
//
//   1) Banco:      npm --workspace apps/backend run db:start
//   2) Backend:    npm --workspace apps/backend run start   (ou start:dev), com
//                  DATABASE_URL/JWT_SECRET configurados (ver apps/backend/.env). O
//                  controller de auth tem rate-limit (5 req/60s por IP por padrao,
//                  `THROTTLE_AUTH_LIMIT`/`THROTTLE_AUTH_TTL`) — como a suite registra e
//                  loga varios usuarios, suba o backend com um limite maior para e2e, ex.:
//                  THROTTLE_AUTH_LIMIT=1000 npm --workspace apps/backend run start
//   3) Frontend:   NEXT_IGNORE_INCORRECT_LOCKFILE=1 npm --workspace apps/frontend run build
//                  && NEXT_IGNORE_INCORRECT_LOCKFILE=1 npm --workspace apps/frontend run start
//                  (ou `npm run dev` na raiz, que sobe os dois em modo dev)
//
// `E2E_BASE_URL` aponta para o frontend (default http://localhost:3000).
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 30_000,
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    testIdAttribute: 'data-testid',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
