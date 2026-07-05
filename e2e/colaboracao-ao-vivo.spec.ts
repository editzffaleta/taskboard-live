// colaboracao-ao-vivo.spec.ts — SPEC VITRINE do TaskBoard Live.
//
// Prova, de ponta a ponta, o valor central do produto: duas pessoas no MESMO quadro veem
// as mudancas uma da outra ao vivo, via Socket.IO, sem reload de pagina.
//
// PRE-CONDICAO (obrigatoria para rodar este spec):
//   - Backend (:4000) e frontend (:3000) de pe (`npm run dev` na raiz, ou os dois apps
//     separadamente) e banco Postgres disponivel (`npm --workspace apps/backend run db:start`).
//   - `E2E_BASE_URL` aponta para o frontend (default http://localhost:3000).
//
// GUARDRAIL: a assercao de "cartao na nova coluna, ao vivo" usa `expect(locator).toBeVisible /
// toHaveCount` com timeout explicito e curto — nunca `page.waitForTimeout` fixo.
import { test, expect, type Browser } from '@playwright/test';
import { verificarAppsDePe } from './helpers/precondicao';
import { registrarELogar } from './helpers/auth';
import { adicionarMembro, criarQuadro } from './helpers/board';
import { arrastarElemento } from './helpers/drag-and-drop';

// Timeout da assercao "ao vivo": suficiente para o round-trip do Socket.IO em ambiente local,
// insuficiente para mascarar uma regressao real de tempo real.
const TIMEOUT_TEMPO_REAL_MS = 5_000;

test.beforeAll(async ({ request }) => {
  await verificarAppsDePe(request);
});

test.describe('vitrine: colaboracao ao vivo', () => {
  test('cartao movido pelo dono aparece na nova coluna para o membro, sem reload', async ({
    browser,
  }: {
    browser: Browser;
  }) => {
    // Dois BrowserContext isolados: identidades distintas (cookies/local storage separados),
    // simulando dois navegadores/pessoas diferentes olhando o mesmo quadro.
    const contextoDono = await browser.newContext();
    const contextoMembro = await browser.newContext();

    try {
      const paginaDono = await contextoDono.newPage();
      const paginaMembro = await contextoMembro.newPage();

      // Usuario A: dono, cria a conta, faz login e cria o quadro.
      await registrarELogar(paginaDono, 'vitrine-dono');
      const nomeQuadro = `Quadro Vitrine ${Date.now()}`;
      const boardId = await criarQuadro(paginaDono, nomeQuadro);

      // Usuario B: membro, cria a conta e faz login (identidade separada).
      const membro = await registrarELogar(paginaMembro, 'vitrine-membro');

      // Dono abre o quadro e adiciona o membro pelo e-mail.
      await paginaDono.goto(`/boards/${boardId}`);
      await adicionarMembro(paginaDono, membro.email);

      // Ambos abrem o mesmo quadro.
      await paginaMembro.goto(`/boards/${boardId}`);
      await expect(paginaMembro.getByTestId('kanban-column')).toHaveCount(0);

      // Dono cria duas listas (origem e destino) e um cartao na primeira. Espera a resposta
      // REST de cada criacao antes de seguir, evitando corrida entre a reconciliacao otimista
      // (troca do id temporario) e o eco do proprio Socket.IO (`list.created`) para o autor.
      await paginaDono.getByTestId('new-list-trigger').click();
      await paginaDono.getByTestId('new-list-title').fill('A Fazer');
      const respostaListaAFazer = paginaDono.waitForResponse(
        (response) => /\/boards\/.+\/lists$/.test(response.url()) && response.request().method() === 'POST',
      );
      await paginaDono.getByTestId('new-list-submit').click();
      await respostaListaAFazer;
      await expect(paginaDono.locator('[data-testid="kanban-column"][data-list-title="A Fazer"]')).toHaveCount(1);

      await paginaDono.getByTestId('new-list-trigger').click();
      await paginaDono.getByTestId('new-list-title').fill('Feito');
      const respostaListaFeito = paginaDono.waitForResponse(
        (response) => /\/boards\/.+\/lists$/.test(response.url()) && response.request().method() === 'POST',
      );
      await paginaDono.getByTestId('new-list-submit').click();
      await respostaListaFeito;
      await expect(paginaDono.locator('[data-testid="kanban-column"][data-list-title="Feito"]')).toHaveCount(1);

      const colunaOrigem = paginaDono.locator('[data-testid="kanban-column"][data-list-title="A Fazer"]');
      await colunaOrigem.getByTestId('new-card-trigger').click();
      const tituloCartao = `Cartao Vitrine ${Date.now()}`;
      await colunaOrigem.getByTestId('new-card-title').fill(tituloCartao);
      const respostaCartao = paginaDono.waitForResponse(
        (response) => /\/boards\/.+\/cards$/.test(response.url()) && response.request().method() === 'POST',
      );
      await colunaOrigem.getByTestId('new-card-submit').click();
      await respostaCartao;

      const cartaoNoDono = colunaOrigem.locator(`[data-testid="kanban-card"][data-card-title="${tituloCartao}"]`);
      await expect(cartaoNoDono).toHaveCount(1);

      // O membro precisa ver as listas e o cartao aparecerem ao vivo tambem (list.created/card.created).
      await expect(
        paginaMembro.locator('[data-testid="kanban-column"][data-list-title="A Fazer"]'),
      ).toBeVisible({ timeout: TIMEOUT_TEMPO_REAL_MS });
      await expect(
        paginaMembro.locator('[data-testid="kanban-column"][data-list-title="Feito"]'),
      ).toBeVisible({ timeout: TIMEOUT_TEMPO_REAL_MS });
      const cartaoNoMembroAntes = paginaMembro.locator(
        `[data-testid="kanban-card"][data-card-title="${tituloCartao}"]`,
      );
      await expect(cartaoNoMembroAntes).toBeVisible({ timeout: TIMEOUT_TEMPO_REAL_MS });

      // O DONO move o cartao de "A Fazer" para "Feito" via drag-and-drop.
      const cartaoOrigemBox = await cartaoNoDono.boundingBox();
      const colunaDestino = paginaDono.locator('[data-testid="kanban-column"][data-list-title="Feito"]');
      const colunaDestinoBox = await colunaDestino.boundingBox();
      if (!cartaoOrigemBox || !colunaDestinoBox) {
        throw new Error('Nao foi possivel calcular as coordenadas do drag-and-drop.');
      }

      const destinoX = colunaDestinoBox.x + colunaDestinoBox.width / 2;
      const destinoY = colunaDestinoBox.y + 40;
      void cartaoOrigemBox;

      // Ver `helpers/drag-and-drop.ts`: `page.mouse` nao aciona de forma confiavel o sensor
      // de mouse do @hello-pangea/dnd em execucao headless — o helper despacha os mesmos
      // `MouseEvent` nativos diretamente no elemento, o que valida-se estavel.
      await arrastarElemento(
        paginaDono,
        `[data-testid="kanban-card"][data-card-title="${tituloCartao}"]`,
        { x: destinoX, y: destinoY },
      );

      // ASSERT (dono): o cartao esta agora na coluna "Feito".
      await expect(
        colunaDestino.locator(`[data-testid="kanban-card"][data-card-title="${tituloCartao}"]`),
      ).toBeVisible();

      // ASSERT (membro, SEM reload): o cartao aparece na nova coluna, via Socket.IO, dentro
      // do timeout curto documentado acima.
      const cartaoNaColunaFeitoDoMembro = paginaMembro
        .locator('[data-testid="kanban-column"][data-list-title="Feito"]')
        .locator(`[data-testid="kanban-card"][data-card-title="${tituloCartao}"]`);
      await expect(cartaoNaColunaFeitoDoMembro).toBeVisible({ timeout: TIMEOUT_TEMPO_REAL_MS });

      // E some da coluna de origem na tela do membro.
      await expect(
        paginaMembro
          .locator('[data-testid="kanban-column"][data-list-title="A Fazer"]')
          .locator(`[data-testid="kanban-card"][data-card-title="${tituloCartao}"]`),
      ).toHaveCount(0, { timeout: TIMEOUT_TEMPO_REAL_MS });
    } finally {
      await contextoDono.close();
      await contextoMembro.close();
    }
  });
});
