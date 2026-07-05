// scripts/screenshots.mjs — script DESCARTAVEL para capturar screenshots reais do TaskBoard
// Live para a vitrine do README de portfolio. Roda contra o app real (backend :4000,
// frontend :3000), via UI, sem mocks. NAO faz parte do gate/CI.
//
// Uso: node scripts/screenshots.mjs
import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, '..', 'docs', 'assets');
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

const SENHA = 'Senha-Forte123!';

function usuarioUnico(prefixo) {
  const sufixo = Date.now();
  return {
    nome: prefixo,
    email: `${prefixo.toLowerCase().replace(/\s+/g, '.')}.${sufixo}@vitrine.taskboard.dev`,
    senha: SENHA,
  };
}

async function registrar(page, usuario) {
  await page.goto(`${BASE_URL}/join`);
  await page.getByTestId('register-name').fill(usuario.nome);
  await page.getByTestId('register-email').fill(usuario.email);
  await page.getByTestId('register-password').fill(usuario.senha);
  const resposta = page.waitForResponse(
    (r) => r.url().endsWith('/auth/register') && r.request().method() === 'POST',
  );
  await page.getByTestId('register-submit').click();
  const r = await resposta;
  if (r.status() !== 201) {
    throw new Error(`Registro falhou (${r.status()}): ${await r.text()}`);
  }
}

async function logar(page, usuario) {
  await page.goto(`${BASE_URL}/join`);
  await page.getByTestId('join-toggle-mode').click();
  await page.getByTestId('login-email').fill(usuario.email);
  await page.getByTestId('login-password').fill(usuario.senha);
  await page.getByTestId('login-submit').click();
  await page.waitForURL(/\/boards/);
  await page.getByTestId('app-shell').waitFor({ state: 'visible' });
}

async function criarQuadro(page, nome) {
  await page.goto(`${BASE_URL}/boards`);
  await page.getByTestId('boards-dashboard').waitFor({ state: 'visible' });
  await page.getByTestId('create-board-trigger').click();
  await page.getByTestId('create-board-name').fill(nome);
  await page.getByTestId('create-board-submit').click();
  const card = page.locator(`[data-testid="board-card"][data-board-name="${nome}"]`).first();
  await card.waitFor({ state: 'visible' });
  const boardId = await card.getAttribute('data-board-id');
  if (!boardId) throw new Error(`Sem id para o quadro ${nome}`);
  return boardId;
}

async function criarLista(page, titulo) {
  await page.getByTestId('new-list-trigger').click();
  await page.getByTestId('new-list-title').fill(titulo);
  const resposta = page.waitForResponse(
    (r) => /\/boards\/.+\/lists$/.test(r.url()) && r.request().method() === 'POST',
  );
  await page.getByTestId('new-list-submit').click();
  await resposta;
  await page
    .locator(`[data-testid="kanban-column"][data-list-title="${titulo}"]`)
    .first()
    .waitFor({ state: 'visible' });
  // aguarda a reconciliacao otimista (id temporario -> id real) assentar antes de seguir,
  // evitando colisao com o eco do proprio socket (list.created) gerando duplicata momentanea.
  await page.waitForTimeout(300);
}

async function criarCartao(page, tituloLista, tituloCartao) {
  const coluna = page.locator(`[data-testid="kanban-column"][data-list-title="${tituloLista}"]`);
  await coluna.getByTestId('new-card-trigger').click();
  await coluna.getByTestId('new-card-title').fill(tituloCartao);
  const resposta = page.waitForResponse(
    (r) => /\/boards\/.+\/cards$/.test(r.url()) && r.request().method() === 'POST',
  );
  await coluna.getByTestId('new-card-submit').click();
  await resposta;
  await coluna
    .locator(`[data-testid="kanban-card"][data-card-title="${tituloCartao}"]`)
    .first()
    .waitFor({ state: 'visible' });
  // mesma cautela da criacao de lista: aguarda a reconciliacao otimista (id temp -> real)
  // assentar antes do proximo cartao, evitando duplicata momentanea na proxima asserção.
  await page.waitForTimeout(300);
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('Registrando Ana Souza...');
  const ana = usuarioUnico('Ana Souza');
  await registrar(page, ana);
  await logar(page, ana);

  console.log('Criando quadros extras para o dashboard...');
  await criarQuadro(page, 'Marketing Q3');
  await criarQuadro(page, 'Roadmap 2026');

  console.log('Criando quadro principal Sprint 42...');
  const boardId = await criarQuadro(page, 'Sprint 42 — Produto');
  await page.goto(`${BASE_URL}/boards/${boardId}`);
  await page.getByTestId('kanban-column').first().waitFor({ state: 'visible' }).catch(() => {});

  console.log('Criando colunas...');
  await criarLista(page, 'A Fazer');
  await criarLista(page, 'Em Progresso');
  await criarLista(page, 'Concluído');

  console.log('Criando cartões...');
  await criarCartao(page, 'A Fazer', 'Onboarding de novos usuários');
  await criarCartao(page, 'A Fazer', 'Página de preços');
  await criarCartao(page, 'A Fazer', 'Corrigir bug do filtro');
  await criarCartao(page, 'Em Progresso', 'Integração de pagamentos');
  await criarCartao(page, 'Em Progresso', 'Refatorar autenticação');
  await criarCartao(page, 'Concluído', 'Setup do CI/CD');
  await criarCartao(page, 'Concluído', 'Design system v1');

  console.log('Screenshot: board.png');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ASSETS_DIR, 'board.png') });

  console.log('Screenshot: activity-or-share.png (painel Atividade)');
  await page.getByRole('button', { name: 'Atividade' }).click();
  await page.getByText('Atividade do quadro').waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ASSETS_DIR, 'activity-or-share.png') });
  await page.keyboard.press('Escape');

  console.log('Screenshot: board-dark.png (tema escuro)');
  await page.getByRole('button', { name: /Ativar tema escuro/i }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(ASSETS_DIR, 'board-dark.png') });
  // volta ao tema claro antes do dashboard, para consistencia visual do dashboard.png
  await page.getByRole('button', { name: /Ativar tema claro/i }).click();
  await page.waitForTimeout(300);

  console.log('Screenshot: dashboard.png');
  await page.goto(`${BASE_URL}/boards`);
  await page.getByTestId('boards-dashboard').waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ASSETS_DIR, 'dashboard.png') });

  await browser.close();
  console.log('Concluído.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
