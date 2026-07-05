// board.ts — helpers de quadro: criar (dashboard) e adicionar membro (painel de compartilhar).
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** Cria um quadro pelo dashboard e retorna seu id (extraido do `data-board-id` do card). */
export async function criarQuadro(page: Page, nome: string): Promise<string> {
  await page.goto('/boards');
  await expect(page.getByTestId('boards-dashboard')).toBeVisible();

  await page.getByTestId('create-board-trigger').click();
  await page.getByTestId('create-board-name').fill(nome);
  await page.getByTestId('create-board-submit').click();

  const card = page.locator(`[data-testid="board-card"][data-board-name="${nome}"]`).first();
  await expect(card).toBeVisible();

  const boardId = await card.getAttribute('data-board-id');
  if (!boardId) {
    throw new Error(`Nao foi possivel extrair o id do quadro "${nome}" recem-criado.`);
  }

  return boardId;
}

/** Abre um quadro existente pelo id. */
export async function abrirQuadro(page: Page, boardId: string): Promise<void> {
  await page.goto(`/boards/${boardId}`);
}

/** Adiciona um membro ao quadro pelo painel "Compartilhar" (deve estar na tela do quadro). */
export async function adicionarMembro(page: Page, emailDoMembro: string): Promise<void> {
  await page.getByTestId('members-panel-trigger').click();
  await page.getByTestId('members-panel-invite-email').fill(emailDoMembro);
  await page.getByTestId('members-panel-invite-submit').click();

  const membro = page.locator(`[data-testid="members-panel-member"][data-member-email="${emailDoMembro}"]`);
  await expect(membro).toBeVisible();

  // fecha o dialog para nao interferir nas interacoes seguintes na tela do quadro.
  await page.keyboard.press('Escape');
}
