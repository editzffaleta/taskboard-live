// smoke-auth.spec.ts — smoke do fluxo critico de autenticacao do TaskBoard Live.
// Pre-condicao: apps de pe (backend :4000 + frontend :3000) e banco disponivel
// (ver playwright.config.ts e openspec/changes/013-fundacao-e2e/design.md).
import { test, expect } from '@playwright/test';
import { verificarAppsDePe } from './helpers/precondicao';
import { gerarUsuarioUnico, logar, registrar } from './helpers/auth';

test.beforeAll(async ({ request }) => {
  await verificarAppsDePe(request);
});

test.describe('smoke de autenticacao', () => {
  test('registro -> login -> chega ao dashboard', async ({ page }) => {
    const usuario = gerarUsuarioUnico('smoke-ok');

    await registrar(page, usuario);
    await logar(page, usuario);

    await expect(page).toHaveURL(/\/boards/);
    await expect(page.getByTestId('boards-dashboard')).toBeVisible();
  });

  test('login invalido mostra erro i18n e nao cria sessao', async ({ page }) => {
    const usuario = gerarUsuarioUnico('smoke-invalido');
    await registrar(page, usuario);

    await page.goto('/join');
    await page.getByTestId('join-toggle-mode').click();
    await page.getByTestId('login-email').fill(usuario.email);
    await page.getByTestId('login-password').fill('senha-completamente-errada');
    await page.getByTestId('login-submit').click();

    // erro exibido via toast (sonner); mensagem i18n de credenciais invalidas.
    await expect(page.getByText('E-mail ou senha inválidos.')).toBeVisible();
    await expect(page).toHaveURL(/\/join/);
  });

  test('logout volta a area publica', async ({ page }) => {
    const usuario = gerarUsuarioUnico('smoke-logout');
    await registrar(page, usuario);
    await logar(page, usuario);

    await page.getByTestId('user-menu-trigger').click();
    await page.getByTestId('logout-button').click();

    await expect(page).toHaveURL(/\/join/);
    await expect(page.getByTestId('join-page')).toBeVisible();
  });
});
