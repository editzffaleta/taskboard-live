// playwright.config.example.ts — referencia para apps/e2e/playwright.config.ts
// Sobe backend (:4000) e frontend (:3000) e roda os specs no chromium,
// reusando o estado de login salvo pelo projeto "setup".
import { defineConfig, devices } from "@playwright/test";

const FRONTEND_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const BACKEND_URL = process.env.E2E_API_URL ?? "http://localhost:4000";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: FRONTEND_URL,
    trace: "on-first-retry",
    testIdAttribute: "data-testid",
  },
  projects: [
    // 1) loga uma vez e salva o storageState
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    // 2) jornadas autenticadas reusam o estado
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: ".auth/user.json" },
      dependencies: ["setup"],
    },
  ],
  // sobe os dois apps; em CI prefira um job que ja deixou tudo em pe.
  webServer: [
    {
      command: "npm run dev --workspace apps/backend",
      url: `${BACKEND_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "npm run dev --workspace apps/frontend",
      url: FRONTEND_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
