<!--
TEMPLATE — tasks do design system. Checkboxes vazios; marque com evidencia ao concluir.
Cada task tem **Aceite**. Fonte de verdade dos tokens: as suas telas/mockups.
-->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `001` concluida (frontend-next-config ja entregou a biblioteca de
> componentes e o `globals.css` dark-only). **Nao faca:** recriar componentes de
> `shared/components/ui/*`; aplicar regra de papel/RBAC; introduzir tenant ou modulo de dominio.

## 1. Tema e tokens

- [ ] 1.1 Reescrever `apps/frontend/src/app/globals.css` mapeando as CSS variables (`--primary`,
  `--accent`, `--border`, `--muted`, `--destructive`, `--ring`, superficies e textos) para a paleta
  TaskBoard Live (primario `{{cor-primaria}}`, hover `{{cor-primaria-hover}}`), definindo **tema claro
  (`:root`) e tema escuro (`.dark`)**. Fonte de verdade: as suas telas.
  - **Aceite:** `globals.css` com claro e escuro, `color-scheme` por tema e todas as variables
    mapeadas a paleta; nenhum componente alterado para isso.
- [ ] 1.2 Adicionar os tokens semanticos `success`, `warning` e `danger/destructive` (com
  `*-foreground`) e garantir que `badge`/status os reflitam.
  - **Aceite:** tokens definidos nos dois temas e expostos ao Tailwind; `badge` com variantes
    `success`/`warning`/`destructive`.
- [ ] 1.3 Configurar as fontes **{{fonte-texto}}** (texto) e **{{fonte-dados}}** (dados/codigo) via
  `next/font` e aplicar a tipografia base.
  - **Aceite:** `app/layout.tsx` carrega as fontes (self-hosted, sem CDN em runtime); `--font-sans`/
    `--font-mono` mapeadas; `body` usa a fonte de texto.

## 2. Tema claro/escuro

- [ ] 2.1 Criar o provider de tema (`shared/context/theme.context.tsx`) com alternancia pela classe
  `.dark`, persistencia via `shared/hooks/use-local-storage.hook` e **tema claro como padrao**;
  incluir script anti-flash no root layout.
  - **Aceite:** `ThemeProvider` + `useTheme`, chave persistida, `.dark` aplicada no `<html>`, sem
    flash na hidratacao; mensagem de erro do hook no i18n (pt/en).
- [ ] 2.2 Disponibilizar o controle de alternancia no `AdminShell`
  (`shared/components/theme/theme-toggle.component.tsx`).
  - **Aceite:** botao no header alterna `.dark`, persiste e mantem a escolha entre sessoes.

## 3. Shell e navegacao

- [ ] 3.1 Adaptar `shared/components/branding/app-logo.component.tsx` para a marca **TaskBoard Live**.
  - **Aceite:** logo/wordmark com a marca TaskBoard Live (funciona em claro e escuro); API do
    componente preservada (`AppLogo`, `AppLogoMark`, `AppWordmark`, tamanhos sm/md/lg).
- [ ] 3.2 Popular a navegacao da sidebar (config estatica em `shared/navigation/app-navigation.config.ts`)
  com as secoes {{secoes-sidebar}}, declarativa e **preparada para o gating por papel da `006`** —
  sem aplicar regras de papel aqui.
  - **Aceite:** `APP_NAVIGATION_SECTIONS` com as secoes e itens, comentario marcando o ponto de
    extensao `roles`/`permissions` da `006`; sidebar consome a config; rota inicial (ex.: `/dashboard`)
    como destino da primeira secao. (Itens podem apontar para rotas que so existirao em `004+`.)
- [ ] 3.3 Garantir o `toaster` (sonner) montado no shell e theme-aware.
  - **Aceite:** `Toaster` montado (cobre o shell) e seguindo o tema atual.

## 4. Verificacao

- [ ] 4.1 Validar que os componentes herdados de `shared/components/ui/*` refletem o tema em claro e
  escuro **sem alteracoes por componente** (re-skin via CSS variables). Ajustar pontualmente apenas
  componentes que usem cor fixa (registrar o desvio).
  - **Aceite:** componentes base refletem o tema so pelas variables; cores cravadas residuais
    trocadas por tokens, sem recriar componente.
- [ ] 4.2 Verificar build/preview do frontend sem erros, com marca, tipografia e alternancia de tema
  funcionando, e confirmar que **nenhum modulo de dominio, papel ou tenant** foi introduzido.
  - **Aceite:** `npx tsc --noEmit` limpo; `build` OK; preview com tema claro padrao, toggle
    persistente, fonte e cor primaria corretas, sidebar com as secoes e a marca; escopo 100% frontend.
