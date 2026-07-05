// auth.ts — helper de registro + login pela UI (regra de nomes exige "Nome Sobrenome").
// Cada chamada gera nome/email unicos por execucao, evitando colisao entre rodadas
// (o projeto nao tem seed fixo — ver design.md da change 013-fundacao-e2e).
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export type UsuarioDeTeste = {
  nome: string;
  email: string;
  senha: string;
};

const SENHA_PADRAO = 'Senha-Forte123!';

let contador = 0;

export function gerarUsuarioUnico(prefixo = 'e2e'): UsuarioDeTeste {
  contador += 1;
  const sufixo = `${Date.now()}-${contador}`;
  return {
    // Regra de dominio (PersonNameRule): exige "Nome Sobrenome", cada parte so com letras —
    // por isso o nome NAO carrega o sufixo numerico (ele vai so no e-mail, para unicidade).
    nome: `Teste ${prefixo.replace(/[^a-zA-Z]/g, '') || 'Fulano'}`,
    email: `${prefixo}.${sufixo}@e2e.taskboard.dev`,
    senha: SENHA_PADRAO,
  };
}

/** Registra um usuario novo pela UI (`/join`, modo registro). */
export async function registrar(page: Page, usuario: UsuarioDeTeste): Promise<void> {
  await page.goto('/join');
  await page.getByTestId('register-name').fill(usuario.nome);
  await page.getByTestId('register-email').fill(usuario.email);
  await page.getByTestId('register-password').fill(usuario.senha);

  const respostaRegistro = page.waitForResponse(
    (response) => response.url().endsWith('/auth/register') && response.request().method() === 'POST',
  );
  await page.getByTestId('register-submit').click();
  const resposta = await respostaRegistro;

  if (resposta.status() !== 201) {
    const corpo = await resposta.text().catch(() => '<sem corpo>');
    throw new Error(
      `Registro falhou (status ${resposta.status()}) para ${usuario.email}: ${corpo}`,
    );
  }

  // O registro bem-sucedido mantem o usuario na tela (toast de sucesso), sem redirecionar.
  await expect(page.getByTestId('join-page')).toBeVisible();
}

/** Faz login pela UI e aguarda a navegacao para a area privada (dashboard). */
export async function logar(page: Page, usuario: Pick<UsuarioDeTeste, 'email' | 'senha'>): Promise<void> {
  await page.goto('/join');
  await page.getByTestId('join-toggle-mode').click();
  await page.getByTestId('login-email').fill(usuario.email);
  await page.getByTestId('login-password').fill(usuario.senha);
  await page.getByTestId('login-submit').click();

  await expect(page).toHaveURL(/\/boards/);
  await expect(page.getByTestId('app-shell')).toBeVisible();
}

/** Registra e loga um usuario novo, retornando os dados usados (para reuso, ex.: convite). */
export async function registrarELogar(page: Page, prefixo = 'e2e'): Promise<UsuarioDeTeste> {
  const usuario = gerarUsuarioUnico(prefixo);
  await registrar(page, usuario);
  await logar(page, usuario);
  return usuario;
}
