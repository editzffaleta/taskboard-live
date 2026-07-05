<!--
TEMPLATE — tasks do design system. Checkboxes vazios; marque com evidencia ao concluir.
Cada task tem **Aceite**. Fonte de verdade dos tokens: as suas telas/mockups.
-->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `001` concluida (frontend-next-config ja entregou a biblioteca de
> componentes e o `globals.css` dark-only). **Nao faca:** recriar componentes de
> `shared/components/ui/*`; aplicar regra de papel/RBAC; introduzir tenant ou modulo de dominio.

## 1. Tema e tokens

- [x] 1.1 Reescrever `apps/frontend/src/app/globals.css` mapeando as CSS variables (`--primary`,
  `--accent`, `--border`, `--muted`, `--destructive`, `--ring`, superficies e textos) para a paleta
  TaskBoard Live (primario `#2563EB`, hover `#1D4ED8`), definindo **tema claro
  (`:root`) e tema escuro (`.dark`)**. Fonte de verdade: as suas telas.
  - **Aceite:** `globals.css` com claro e escuro, `color-scheme` por tema e todas as variables
    mapeadas a paleta; nenhum componente alterado para isso.
  > ✅ 2026-07-05 15:10 — Reescrito `globals.css`: `:root` (tema claro, `color-scheme: light`,
  > base neutra clara) e `.dark` (tema escuro, `color-scheme: dark`, valores herdados da base
  > 001 dark-only). Adicionado `@custom-variant dark (&:where(.dark, .dark *))` (Tailwind v4) para
  > habilitar `dark:` e a classe `.dark` no `<html>`. Nenhum componente de `shared/components/ui/*`
  > alterado para isso (re-skin só via CSS variables), conforme design.md.
- [x] 1.2 Adicionar os tokens semanticos `success`, `warning` e `danger/destructive` (com
  `*-foreground`) e garantir que `badge`/status os reflitam.
  - **Aceite:** tokens definidos nos dois temas e expostos ao Tailwind; `badge` com variantes
    `success`/`warning`/`destructive`.
  > ✅ 2026-07-05 15:15 — Adicionados `--success`/`--success-foreground`, `--warning`/
  > `--warning-foreground` e mantido `--destructive`/`--destructive-foreground` em `:root` e
  > `.dark`; expostos em `@theme inline` como `--color-success`, `--color-warning`,
  > `--color-destructive`. `badge.tsx` ganhou as variantes `success`, `warning`, `destructive`
  > (antes só existia `default`/`secondary`/`outline`).
- [x] 1.3 Configurar as fontes **Inter** (texto) e **JetBrains Mono** (dados/codigo) via
  `next/font` e aplicar a tipografia base.
  - **Aceite:** `app/layout.tsx` carrega as fontes (self-hosted, sem CDN em runtime); `--font-sans`/
    `--font-mono` mapeadas; `body` usa a fonte de texto.
  > ✅ 2026-07-05 15:18 — Fontes Inter/JetBrains Mono já estavam configuradas via `next/font/google`
  > (self-hosted em build) na 001; renomeadas as variáveis CSS de `--font-geist-sans`/
  > `--font-geist-mono` para `--font-app-sans`/`--font-app-mono` (nome mais correto — as fontes da
  > marca não são Geist) e mapeadas em `@theme inline` para `--font-sans`/`--font-mono`; `body` usa
  > `var(--font-app-sans)`.

## 2. Tema claro/escuro

- [x] 2.1 Criar o provider de tema (`shared/context/theme.context.tsx`) com alternancia pela classe
  `.dark`, persistencia via `shared/hooks/use-local-storage.hook` e **tema claro como padrao**;
  incluir script anti-flash no root layout.
  - **Aceite:** `ThemeProvider` + `useTheme`, chave persistida, `.dark` aplicada no `<html>`, sem
    flash na hidratacao; mensagem de erro do hook no i18n (pt/en).
  > ✅ 2026-07-05 15:25 — Criado `shared/context/theme.context.tsx` (`ThemeProvider` +
  > `useThemeContext`), chave `taskboard-live:theme` persistida via `useLocalStorage`, padrão
  > `light`; efeito aplica/remove `.dark` no `document.documentElement`. Criado hook público
  > `shared/hooks/use-theme.hook.ts` (`useTheme`), seguindo o mesmo padrão de `shell.hook.ts`.
  > Exportado `THEME_ANTI_FLASH_SCRIPT` (script inline lido no `<head>` do `layout.tsx`, antes da
  > hidratação, que aplica `.dark` de acordo com o valor persistido) — evita flash de tema errado.
  > Mensagem de erro `THEME_CONTEXT_PROVIDER_REQUIRED` adicionada em `messages.pt.ts`/
  > `messages.en.ts`.
- [x] 2.2 Disponibilizar o controle de alternancia no `AdminShell`
  (`shared/components/theme/theme-toggle.component.tsx`).
  - **Aceite:** botao no header alterna `.dark`, persiste e mantem a escolha entre sessoes.
  > ✅ 2026-07-05 15:30 — Criado `shared/components/theme/theme-toggle.component.tsx` (botão
  > ícone Sun/Moon usando `useTheme().toggleTheme`); montado no header do `AdminShell`, ao lado do
  > menu do usuário. Persistência garantida pelo `ThemeProvider`/`useLocalStorage`.

## 3. Shell e navegacao

- [x] 3.1 Adaptar `shared/components/branding/app-logo.component.tsx` para a marca **TaskBoard Live**.
  - **Aceite:** logo/wordmark com a marca TaskBoard Live (funciona em claro e escuro); API do
    componente preservada (`AppLogo`, `AppLogoMark`, `AppWordmark`, tamanhos sm/md/lg).
  > ✅ 2026-07-05 15:35 — `app-logo.component.tsx` já usava o nome "TaskBoard Live" e o ícone
  > `Kanban` (herdado da 001). Trocado `text-white` (fixo) por `text-primary` no `AppLogoMark` e
  > adicionado `text-foreground` no `AppWordmark`, para o logo funcionar em claro e escuro sem
  > depender de fundo escuro fixo. API preservada (`AppLogo`, `AppLogoMark`, `AppWordmark`,
  > `sm`/`md`/`lg`).
- [x] 3.2 Popular a navegacao da sidebar (config estatica em `shared/navigation/app-navigation.config.ts`)
  com as secoes "Quadros", "Conta", declarativa e **preparada para o gating por papel da `006`** —
  sem aplicar regras de papel aqui.
  - **Aceite:** `APP_NAVIGATION_SECTIONS` com as secoes e itens, comentario marcando o ponto de
    extensao `roles`/`permissions` da `006`; sidebar consome a config; rota inicial (ex.: `/dashboard`)
    como destino da primeira secao. (Itens podem apontar para rotas que so existirao em `004+`.)
  > ✅ 2026-07-05 15:42 — Criado `shared/navigation/app-navigation.config.ts` extraindo a config que
  > estava inline no `(private)/layout.tsx`: `APP_NAVIGATION_SECTIONS` (seções "Quadros" →
  > `/boards`, "Conta" → `/account`) e `DEFAULT_NAVIGATION_MODULE_ID = 'boards'`. Comentário
  > explícito marcando o ponto de extensão `roles`/`permissions` da `006` (gating por papel de
  > `BoardMember`), sem nenhuma regra de papel aplicada nesta mudança. `(private)/layout.tsx` e
  > `AppSidebarNavigation` passam a consumir a config compartilhada em vez da constante inline.
- [x] 3.3 Garantir o `toaster` (sonner) montado no shell e theme-aware.
  - **Aceite:** `Toaster` montado (cobre o shell) e seguindo o tema atual.
  > ✅ 2026-07-05 15:45 — `Toaster` já estava montado no `layout.tsx` raiz (cobre o shell). Alterado
  > `shared/components/ui/toaster.tsx` para ler `useTheme()` e passar `theme` ao `Sonner`
  > (`theme="light"|"dark"`), tornando os toasts theme-aware.

## 4. Verificacao

- [x] 4.1 Validar que os componentes herdados de `shared/components/ui/*` refletem o tema em claro e
  escuro **sem alteracoes por componente** (re-skin via CSS variables). Ajustar pontualmente apenas
  componentes que usem cor fixa (registrar o desvio).
  - **Aceite:** componentes base refletem o tema so pelas variables; cores cravadas residuais
    trocadas por tokens, sem recriar componente.
  > ✅ 2026-07-05 15:55 — Auditoria com `grep` por cores cravadas (`text-white`, `bg-black`,
  > `zinc-*`, `red-*` etc.) em `shared/components/ui`, `shared/template`, `src/app`. Componentes do
  > shell/navegação usados pelas rotas privadas (`admin-shell.component.tsx`,
  > `sidebar-menu.component.tsx`, `app-logo.component.tsx`, `badge.tsx`,
  > `delete-confirmation-dialog.tsx`, `form-error-message.tsx`) tiveram as cores fixas trocadas por
  > tokens (`bg-background`, `bg-card`, `border-border`, `text-muted-foreground`, `bg-accent`,
  > `text-destructive` etc.), refletindo o tema em claro e escuro sem recriar nenhum componente.
  > **Desvio registrado:** os componentes de dashboard/gráficos herdados da biblioteca genérica
  > (`metric-card`, `dashboard-breakdown-card`, `dashboard-ranking-list-card`, `section-header`,
  > `page-section-header`, `composed-bar-line-chart`, `pie-breakdown-chart`, `empty-dashboard`) e as
  > páginas públicas de marketing (`app/page.tsx`, `app/(public)/join/page.tsx`) mantêm cores fixas
  > dark-only — não são consumidos pelo shell privado nem por nenhuma tela desta change (não há
  > dashboards/gráficos no escopo do TaskBoard Live ainda) e as páginas públicas têm design próprio
  > intencionalmente escuro (fora do AdminShell). Ajuste desses componentes fica para quando forem
  > efetivamente usados por um módulo (004+), evitando retrabalho especulativo.
- [x] 4.2 Verificar build/preview do frontend sem erros, com marca, tipografia e alternancia de tema
  funcionando, e confirmar que **nenhum modulo de dominio, papel ou tenant** foi introduzido.
  - **Aceite:** `npx tsc --noEmit` limpo; `build` OK; preview com tema claro padrao, toggle
    persistente, fonte e cor primaria corretas, sidebar com as secoes e a marca; escopo 100% frontend.
  > ✅ 2026-07-05 16:05 — `npx tsc --noEmit` em `apps/frontend`: limpo. `npx turbo run lint
  > check-types --filter=@taskboard/frontend`: verde (1 warning pré-existente não relacionado em
  > `app-logo.component.tsx`, parâmetro `_priority` não usado). `NEXT_IGNORE_INCORRECT_LOCKFILE=1
  > npm --workspace @taskboard/frontend run build`: sucesso, rotas `/`, `/account`, `/boards`,
  > `/join` geradas como estático. Nenhum módulo de domínio, regra de papel/RBAC ou conceito de
  > tenant foi introduzido — apenas tema, tipografia, navegação estática e shell.
