'use client';

import { useLayoutEffect, useState, type ReactNode } from 'react';
import { setI18nLocale } from '@/shared/i18n';

export const LOCALE_STORAGE_KEY = 'taskboard-live:locale';

/**
 * Aplica, no boot do app (client-side), o idioma persistido em `localStorage` (`021` —
 * seletor de idioma da tela de Configurações da Conta) antes que o restante da árvore
 * seja pintado. `setI18nLocale`/`getCurrentLocale` (`shared/i18n/index.ts`) não são
 * reativos a estado React — são um módulo com variável `forcedLocale` — então, sem este
 * gate, os textos já renderizados no primeiro paint (com o locale padrão `pt`) nunca
 * seriam atualizados sozinhos. O primeiro render (SSR e primeiro paint client) é idêntico
 * (padrão `pt`, sem tocar `localStorage`, evitando mismatch de hidratação); a troca de
 * `state.ready` dentro de `useLayoutEffect` força um novo render com o locale já
 * aplicado, antes do navegador pintar a tela — sem "flash" perceptível, mesmo padrão do
 * `THEME_ANTI_FLASH_SCRIPT`.
 */
export function LocaleBootstrap({ children }: { children: ReactNode }) {
  const [, forceRerender] = useState(0);

  useLayoutEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (stored) {
        setI18nLocale(stored);
        // Hidratação client-only inevitável: `forcedLocale` (módulo `shared/i18n`) não é
        // reativo a estado React, então este `setState` força o único re-render
        // necessário para aplicar o locale persistido antes do primeiro paint visível.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        forceRerender((count) => count + 1);
      }
    } catch {
      // Ignora falhas de acesso ao localStorage (ex.: modo privado) — mantém o padrão pt.
    }
  }, []);

  return <>{children}</>;
}
