// scripts/screenshots-v2.mjs — script DESCARTAVEL para capturar screenshots reais
// do TaskBoard Live (pos-v2) para o README de portfolio. Nao faz parte da suite e2e.
//
// Uso: node scripts/screenshots-v2.mjs
// Pre-condicao: backend :4000 e frontend :3000 de pe, Postgres com os dados de
// ana@taskboard.dev / Teste@2026 (ver scripts/setup-card.mjs para o cartao enriquecido).
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ASSETS_DIR = resolve(ROOT, 'docs/assets');
const BASE_URL = 'http://localhost:3000';

const BOARD_ID = '44d156ca-43b1-4b6f-970b-864d863709a0'; // Sprint 42 — Produto
const CARD_ID = '4b2c7096-c5f4-4cca-a78d-424dd9206b1b'; // Integração de pagamentos

mkdirSync(ASSETS_DIR, { recursive: true });

async function login(page) {
  await page.goto(`${BASE_URL}/join`);
  await page.getByTestId('join-toggle-mode').click();
  await page.getByTestId('login-email').fill('ana@taskboard.dev');
  await page.getByTestId('login-password').fill('Teste@2026');
  await page.getByTestId('login-submit').click();
  await page.waitForURL(/\/boards/);
  await page.getByTestId('app-shell').waitFor({ state: 'visible' });
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await login(page);

  // 1) dashboard.png — "Meus quadros" com a sidebar
  await page.goto(`${BASE_URL}/boards`);
  await page.getByTestId('boards-dashboard').waitFor({ state: 'visible' });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: resolve(ASSETS_DIR, 'dashboard.png') });
  console.log('dashboard.png capturado');

  // 2) board.png — quadro Sprint 42, kanban, tema claro
  await page.goto(`${BASE_URL}/boards/${BOARD_ID}`);
  await page.getByTestId('board-view-switcher').waitFor({ state: 'visible' });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await page.screenshot({ path: resolve(ASSETS_DIR, 'board.png') });
  console.log('board.png capturado');

  // 3) card-detail.png — modal de detalhe do cartão enriquecido
  await page.goto(`${BASE_URL}/boards/${BOARD_ID}?card=${CARD_ID}`);
  let modal = page.getByTestId('card-detail-modal');
  try {
    await modal.waitFor({ state: 'visible', timeout: 5000 });
  } catch {
    // fallback: abrir o cartão clicando nele
    const card = page.locator(`[data-testid="board-card"]:has-text("Integração de pagamentos")`);
    await card.first().click();
    await modal.waitFor({ state: 'visible' });
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: resolve(ASSETS_DIR, 'card-detail.png') });
  console.log('card-detail.png capturado');

  // fechar modal (Escape) antes de continuar
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 4) views.png — visão Lista
  await page.goto(`${BASE_URL}/boards/${BOARD_ID}`);
  await page.getByTestId('board-view-switcher').waitFor({ state: 'visible' });
  await page.getByTestId('board-view-switcher-lista').click();
  await page.getByTestId('board-view-list').waitFor({ state: 'visible' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(ASSETS_DIR, 'views.png') });
  console.log('views.png capturado');

  // 5) templates.png — galeria de Modelos
  await page.goto(`${BASE_URL}/templates`);
  await page.getByTestId('templates-gallery').waitFor({ state: 'visible' });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(ASSETS_DIR, 'templates.png') });
  console.log('templates.png capturado');

  // 6) board-dark.png — quadro em tema escuro
  await page.goto(`${BASE_URL}/boards/${BOARD_ID}`);
  await page.getByTestId('board-view-switcher').waitFor({ state: 'visible' });
  const themeToggle = page.locator('button[aria-label="Ativar tema escuro"]');
  if (await themeToggle.count()) {
    await themeToggle.click();
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(ASSETS_DIR, 'board-dark.png') });
  console.log('board-dark.png capturado');

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
