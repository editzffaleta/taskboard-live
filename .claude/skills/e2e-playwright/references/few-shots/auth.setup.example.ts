// auth.setup.example.ts — referencia para apps/e2e/tests/auth.setup.ts
// Loga uma vez e persiste o estado autenticado em .auth/user.json.
// Os demais specs herdam esse storageState (ver playwright.config).
import { test as setup, expect } from "@playwright/test";

const STORAGE = ".auth/user.json";

// Credenciais de um usuario semeado no banco de TESTE (nunca dado real).
const EMAIL = process.env.E2E_USER_EMAIL ?? "e2e.admin@test.dev";
const PASSWORD = process.env.E2E_USER_PASSWORD ?? "Test1234!";

setup("autentica e salva o estado", async ({ page }) => {
  await page.goto("/login");

  await page.getByTestId("login-email").fill(EMAIL);
  await page.getByTestId("login-password").fill(PASSWORD);
  await page.getByTestId("login-submit").click();

  // espera a navegacao pos-login (area privada) — sem sleep
  await expect(page).toHaveURL(/\/(dashboard|app)/);
  await expect(page.getByTestId("app-shell")).toBeVisible();

  await page.context().storageState({ path: STORAGE });
});
