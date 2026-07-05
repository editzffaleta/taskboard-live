// precondicao.ts — checa se o E2E_BASE_URL responde antes de rodar a suite.
// Falha rapido com instrucao clara, em vez de deixar cada spec falhar com timeouts confusos.
import type { APIRequestContext } from '@playwright/test';

export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export async function verificarAppsDePe(request: APIRequestContext): Promise<void> {
  try {
    const response = await request.get(BASE_URL, { timeout: 5_000 });
    if (!response.ok() && response.status() >= 500) {
      throw new Error(`Frontend respondeu ${response.status()}`);
    }
  } catch (error) {
    throw new Error(
      `Nao foi possivel alcancar ${BASE_URL}. Suba os apps: npm run dev ` +
        '(ou backend/frontend separadamente, com o banco disponivel via ' +
        '`npm --workspace apps/backend run db:start`). Causa original: ' +
        `${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
