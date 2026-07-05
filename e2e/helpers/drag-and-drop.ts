// drag-and-drop.ts — helper de arraste para o quadro (@hello-pangea/dnd).
//
// Por que nao usar `page.mouse.move/down/up` puro: em execucao headless (Chromium via CDP),
// os eventos de mouse sinteticos do Playwright nao acionam de forma confiavel o sensor de
// mouse do @hello-pangea/dnd (mesma familia do react-beautiful-dnd) — o `mousedown`/`mousemove`
// chegam ao `window` (confirmado via listener de captura), mas o estado interno da lib nao
// transiciona para "dragging". Despachar os mesmos eventos nativos (`MouseEvent`) diretamente
// no elemento via `page.evaluate` funciona de forma estavel (validado manualmente). Este
// helper concentra esse desvio documentado da skill (que recomenda `page.mouse`) em um unico
// lugar, com um fallback de coordenadas explicito.
import type { Page } from '@playwright/test';

type Ponto = { x: number; y: number };

/**
 * Arrasta o elemento em `origemSelector` ate as coordenadas de `destino`, disparando uma
 * sequencia de `MouseEvent` (`mousedown` -> `mousemove`*N -> `mouseup`) diretamente no
 * elemento, com os campos que o sensor de mouse do @hello-pangea/dnd espera.
 */
export async function arrastarElemento(
  page: Page,
  origemSelector: string,
  destino: Ponto,
  passos = 12,
): Promise<void> {
  await page.evaluate(
    async ({ selector, destino, passos }) => {
      const el = document.querySelector(selector);
      if (!el) {
        throw new Error(`Elemento de origem do drag nao encontrado: ${selector}`);
      }

      const rect = el.getBoundingClientRect();
      const origem = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };

      function disparar(tipo: string, ponto: Ponto, buttons: number) {
        const evento = new MouseEvent(tipo, {
          bubbles: true,
          cancelable: true,
          clientX: ponto.x,
          clientY: ponto.y,
          button: 0,
          buttons,
        });
        el!.dispatchEvent(evento);
      }

      // @hello-pangea/dnd recalcula colisao/posicao via requestAnimationFrame; disparar
      // todos os mousemoves na mesma micro-tarefa (sem ceder ao event loop) faz a lib so
      // "ver" a ultima posicao. Por isso cada passo cede um frame real antes do proximo.
      function proximoFrame(): Promise<void> {
        return new Promise((resolve) => requestAnimationFrame(() => resolve()));
      }

      disparar('mousedown', origem, 1);
      await proximoFrame();

      for (let i = 1; i <= passos; i += 1) {
        const ponto = {
          x: origem.x + ((destino.x - origem.x) * i) / passos,
          y: origem.y + ((destino.y - origem.y) * i) / passos,
        };
        disparar('mousemove', ponto, 1);
        await proximoFrame();
      }

      // alguns frames extras parados sobre o destino, para a lib assentar o "drop target".
      await proximoFrame();
      await proximoFrame();
      await proximoFrame();

      disparar('mouseup', destino, 0);
    },
    { selector: origemSelector, destino, passos },
  );
}
