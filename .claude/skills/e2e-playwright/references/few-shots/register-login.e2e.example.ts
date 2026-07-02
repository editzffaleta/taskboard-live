// register-login.e2e.example.ts — fluxo critico de referencia.
// Demonstra: data-testid, Page Object, dado isolado por sufixo unico,
// web-first assertions (zero sleep) e um caso negativo.
import { test, expect, type Page } from "@playwright/test";

// --- Page Object minimo (em apps/e2e/tests/pages/, encapsula seletores) ---
class RegisterPage {
  constructor(private readonly page: Page) {}
  async goto() {
    await this.page.goto("/join");
  }
  async register(name: string, email: string, password: string) {
    await this.page.getByTestId("register-name").fill(name);
    await this.page.getByTestId("register-email").fill(email);
    await this.page.getByTestId("register-password").fill(password);
    await this.page.getByTestId("register-submit").click();
  }
}

// Este fluxo NAO usa o usuario logado do setup: cria conta nova.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("registro + login", () => {
  test("registra, faz login e cai na area privada", async ({ page }) => {
    const unique = Date.now();
    const email = `e2e+${unique}@test.dev`;
    const password = "Test1234!";

    const register = new RegisterPage(page);
    await register.goto();
    await register.register("Usuario E2E", email, password);
    await expect(page.getByTestId("register-success")).toBeVisible();

    await page.goto("/login");
    await page.getByTestId("login-email").fill(email);
    await page.getByTestId("login-password").fill(password);
    await page.getByTestId("login-submit").click();

    await expect(page).toHaveURL(/\/(dashboard|app)/);
    await expect(page.getByTestId("app-shell")).toBeVisible();
  });

  test("nega login com senha errada", async ({ page }) => {
    await page.goto("/login");
    await page.getByTestId("login-email").fill("e2e.admin@test.dev");
    await page.getByTestId("login-password").fill("senha-errada");
    await page.getByTestId("login-submit").click();

    await expect(page.getByTestId("form-error")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
