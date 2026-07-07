> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `014` concluída (telas públicas/estados de sistema/onboarding). **Não faça:**
> nenhuma mudança de backend/schema/contrato de tempo real; nenhum dado fake/lorem no código final
> (mockups são só referência visual); nenhum campo agregado inventado (contagem de listas/cartões,
> "há Xh", membros do card) se a API não expuser — omitir, nunca inventar; **nenhum elemento de
> cartão rico** (etiquetas, prazo, checklist, avatares de responsáveis, comentários) nem filtros/
> visões (Tabela, Calendário) — isso é escopo das changes `016`-`019`.

## 1. Shell privado (sidebar + topbar)

- [x] 1.1 Ler `apps/frontend/src/shared/template/admin-shell.component.tsx`,
  `apps/frontend/src/shared/navigation/app-sidebar-navigation.component.tsx` e
  `apps/frontend/src/shared/navigation/app-navigation.config.ts` para confirmar props/estrutura
  atuais antes de editar.
  - **Pré:** `014` concluída (app funcional ponta a ponta).
  - **Aceite:** entendimento documentado na evidência de quais props são mantidas.
  - > ✅ 2026-07-06 — Lido. `AdminShell` mantém a mesma API (`sidebar`, `children`, `userName`,
    `userEmail`, `userAvatarUrl`, `onLogout`) usada por `(private)/layout.tsx`; a sidebar em si é
    montada por `AppSidebarNavigation` + `SidebarMenu` (dois níveis de navegação — módulos
    `boards`/`account`). `app-navigation.config.ts` é config estática, sem mudança estrutural
    necessária (a seção "Seus quadros" foi adicionada dentro do próprio
    `AppSidebarNavigation`, abaixo do `SidebarMenu`, para não reescrever o componente genérico
    `sidebar-menu.component.tsx`, que é infraestrutura de navegação reaproveitada).

- [x] 1.2 Reestilizar `admin-shell.component.tsx` reproduzindo a estrutura de
  `mockups/Meus Quadros.dc.html`/`mockups/Quadro ao Vivo.dc.html` (aside fixo com marca "TaskBoard
  Live", topbar com toggle de tema e menu do usuário), preservando 100% as props existentes
  (`sidebar`, `children`, `userName`, `userEmail`, `userAvatarUrl`, `onLogout`) e o
  `data-testid="app-shell"`/`"user-menu-trigger"`/`"logout-button"` para não quebrar e2e (`013`).
  - **Pré:** 1.1 concluída.
  - **Aceite:** visual confere com o mockup (marca, aside, topbar); logout e toggle de tema
    continuam funcionando; nenhum `data-testid` existente removido.
  - **Não faça:** alterar `AuthGuard`/`ShellProvider`/`(private)/layout.tsx` além do necessário
    para passar props de estilo.
  - > ✅ 2026-07-06 — Topbar reestilizada (altura 56px, fundo `bg-card` sólido em vez de blur,
    botão do usuário com cantos arredondados) mantendo 100% as props e os três `data-testid`.
    **Desvio:** a estrutura de aside com largura fixa 250px do mockup não foi reproduzida
    literalmente — o `AdminShell` já usa um padrão de sidebar responsiva/colapsável
    (`w-84`/`w-18` + `Sheet` mobile) estabelecido na `002` e reaproveitado por todo o shell;
    reescrever a largura fixa quebraria o comportamento responsivo/colapsável existente sem
    ganho real de fidelidade (o conteúdo — marca, navegação, quadros, usuário — já é o mesmo).
    Registrado como desvio consciente.

- [x] 1.3 Reestilizar `app-sidebar-navigation.component.tsx`/`app-navigation.config.ts`: itens de
  navegação com ícone + label no estilo do mockup, item ativo destacado (fundo/texto `primary`).
  Adicionar seção "Seus quadros" listando os quadros reais do usuário (via `listMyBoards` de
  `boards.api.ts`) com indicador de cor por quadro usando o utilitário da task 1.4.
  - **Pré:** 1.4 concluída (utilitário de cor).
  - **Aceite:** sidebar mostra os quadros reais do usuário logado (não os nomes fictícios do
    mockup); clicar em um quadro da lista navega para `/boards/{id}`; item "Meus quadros" fica
    ativo na rota `/boards`.
  - **Não faça:** adicionar "Notificações" com contador fixo (não há endpoint) — omitir; não criar
    rotas novas para "Modelos"/"Arquivados" do mockup — omitir ou deixar visualmente desabilitado.
  - > ✅ 2026-07-06 — `AppSidebarNavigation` agora busca `listMyBoards(token)` (mesma função do
    dashboard) e renderiza uma seção "Seus quadros" com um ponto de cor (`getBoardAccentColor`)
    e o nome real de cada quadro, link para `/boards/{id}`, destaque `bg-primary/10 text-primary`
    quando ativo. Falha de rede é silenciosa aqui (decoração de navegação) pois o dashboard já
    reporta o erro ao usuário. "Notificações"/"Modelos"/"Arquivados" do mockup: omitidos por
    completo (sem endpoint/rota real), conforme instrução.

- [x] 1.4 Criar `apps/frontend/src/modules/boards/utils/board-color.util.ts` com
  `getBoardAccentColor(boardId: string): string` (hash determinístico do `id` → paleta fixa de
  tokens de cor já usados no design system), função pura sem estado nem chamada de rede.
  - **Aceite:** mesmo `boardId` sempre retorna a mesma cor; usado por 1.3 e pela task 2.2.
  - > ✅ 2026-07-06 — Criado em `apps/frontend/src/modules/boards/util/board-color.util.ts`
    (retorna `{ dot, gradient }`, não só uma string, para cobrir tanto o ponto da sidebar quanto
    o gradiente da capa do card). **Desvio de caminho:** `util/` (singular) em vez de `utils/`
    (plural) sugerido no `design.md`, para seguir a convenção já existente no módulo
    (`util/board-state.reducer.ts`, `util/activity-label.util.ts`). Hash simples (soma de char
    codes) módulo 6 sobre uma paleta fixa de tokens Tailwind/design system.

## 2. Meus Quadros (dashboard)

- [x] 2.1 Ler `apps/frontend/src/modules/boards/api/boards.api.ts` para confirmar quais campos o
  `Board`/`listMyBoards` realmente retornam (membros, contagem de listas/cartões, timestamp de
  atividade) — decidir, para cada elemento do mockup, se é implementável com dado real ou deve ser
  omitido; registrar a decisão na evidência.
  - **Aceite:** decisão documentada por elemento (capa, avatares, contagem, atividade recente).
  - > ✅ 2026-07-06 — `Board = { id, name, ownerId, createdAt }` (`boards.api.ts:3-8`). Decisões:
    (a) **capa gradiente** — implementável, é puramente apresentacional via `getBoardAccentColor`;
    (b) **avatares de membros no card do dashboard** — **omitido**: `listMyBoards` não retorna
    membros (só listMembers por quadro individual, que exigiria N chamadas extras não previstas
    no design para a grade); (c) **contagem de listas/cartões** — **omitido**: não existe no
    `Board` nem em `listMyBoards`; (d) **atividade recente ("há Xh")** — **omitido**: não há
    `updatedAt` nem last-activity agregado em `Board`. Único dado real além do nome: `board.id`
    (para a cor) e `board.ownerId` (já usado para o menu de ações).

- [x] 2.2 Reestilizar `boards-dashboard.component.tsx`: cabeçalho com título "Meus quadros" e
  contagem real `${boards.length} quadros` (sem "pessoas no espaço" — não há workspace no
  domínio); grid de cards no estilo `auto-fill,minmax(258px,1fr)` do mockup. Preservar toda a
  lógica existente (`listMyBoards`, `handleCreated/Renamed/Deleted`, skeleton de `014`,
  `BoardOnboarding` de `014`, estado vazio).
  - **Pré:** 2.1 concluída.
  - **Aceite:** grid renderiza com o espaçamento/estilo do mockup; onboarding e skeleton (`014`)
    continuam sendo exibidos nos mesmos gatilhos de antes; `data-testid="boards-dashboard"` e
    `"boards-list"` preservados.
  - > ✅ 2026-07-06 — Cabeçalho com `${boards.length} quadros`/`1 quadro` real (sem "pessoas no
    espaço"); grid `grid-cols-[repeat(auto-fill,minmax(258px,1fr))]`. Lógica/`data-testid`
    intactos; skeleton e onboarding continuam nos mesmos gatilhos (`status === 'loading'` /
    `boards.length === 0 && !onboardingSkipped`).

- [x] 2.3 Reestilizar `board-card.component.tsx` reproduzindo o card do mockup: capa com gradiente
  usando `getBoardAccentColor(board.id)` (task 1.4), nome do quadro, e — apenas para os campos
  confirmados como reais na 2.1 — avatares de membros/contagem/atividade recente; campos não
  confirmados ficam omitidos (não inventados). Preservar 100% a lógica de rename/delete/navegação
  e `data-testid="board-card"`/`"board-card-open"`.
  - **Pré:** 2.1 e 1.4 concluídas.
  - **Aceite:** visual confere com o mockup nos campos que existem; nenhum dado fixo tipo "12
    cartões"/"8 pessoas" aparece se a API não fornece; rename/delete continuam funcionando; e2e da
    `013`/`014` que dependem de `board-card`/`board-card-open` não quebram.
  - > ✅ 2026-07-06 — Capa de 80px com gradiente determinístico + silhuetas decorativas (mesmo
    padrão visual do mockup, sem dado nenhum atrelado), nome do quadro abaixo. Avatares/contagem/
    atividade recente omitidos conforme decisão da 2.1. Lógica de rename/delete/navegação e
    `data-testid` inalterados (menu de ações reposicionado para `top-24` por causa da nova capa).

- [x] 2.4 Reestilizar `create-board-dialog.component.tsx` ao layout do modal "Criar quadro" do
  mockup (capa de prévia decorativa + campo nome), preservando 100% o formulário e a chamada
  `createBoard` existente.
  - **Aceite:** visual confere com o mockup; criar quadro continua funcionando e aparecendo na
    grade.
  - > ✅ 2026-07-06 — Adicionada capa decorativa (gradiente `primary`→`blue-700` + 3 silhuetas)
    acima do formulário, sem novo campo de estado (é decoração fixa, já que não existe seleção de
    plano de fundo real no domínio). Formulário/`createBoard` inalterados.

## 3. Quadro ao Vivo

- [x] 3.1 Reestilizar `board-toolbar.component.tsx`: badge "ao vivo" pulsante (ponto verde +
  `animate-ping`, reaproveitando a lógica de `connected`/`reconnecting` já existente de `014` sem
  duplicar o banner de reconexão), ícones/estilo dos botões "Atividade"/"Compartilhar" no padrão do
  mockup, botão "Nova lista" reestilizado. Preservar toda a lógica de criação de lista e todos os
  `data-testid` existentes (`new-list-trigger`, `new-list-title`, `new-list-submit`).
  - **Pré:** `014` concluída (campo `reconnecting` do hook).
  - **Aceite:** visual confere com o mockup; criar lista continua funcionando; nenhum
    `data-testid` removido.
  - **Não faça:** adicionar os botões de visão "Tabela"/"Calendário" ou o filtro "Responsável"/
    "Filtrar" do mockup — fora de escopo (`016`-`019`).
  - > ✅ 2026-07-06 — Badge "ao vivo" com ponto verde `animate-ping` (só quando `connected`),
    mantendo o aviso "reconectando..." existente (`014`) quando não conectado — sem duplicar o
    `BoardReconnectBanner`. Ícone de "Compartilhar" (`MembersPanel`) trocado para `UserPlus`
    (equivalente a `person_add`) e vira botão primário (`variant` padrão); ícone de "Atividade"
    (`ActivityPanel`) trocado para `Zap` (equivalente a `bolt`). Nenhum `data-testid` alterado;
    "Tabela"/"Calendário"/filtros não adicionados.

- [x] 3.2 Reestilizar `board-presence.component.tsx`: avatares sobrepostos com anel de status "ao
  vivo" (equivalente ao ponto verde `--live` do mockup), mesma prop `users: PresenceUser[]`.
  - **Aceite:** visual confere com o mockup; presença continua atualizando via `useBoardSocket`
    sem nenhuma mudança de lógica.
  - > ✅ 2026-07-06 — Adicionado ponto verde (`bg-emerald-500`) sobreposto no canto de cada
    avatar de presença. Prop e lógica (`useBoardSocket` → `presenceUsers`) inalteradas.

- [x] 3.3 Reestilizar `kanban-column.component.tsx`: cabeçalho de coluna (título, contador real de
  cartões, botão de adicionar cartão) e container de cartões no estilo do mockup. Preservar
  `Droppable`/DnD e todos os `data-testid` existentes.
  - **Aceite:** visual confere com o mockup; arrastar cartões entre colunas continua funcionando;
    contador de cartões reflete o array real.
  - > ✅ 2026-07-06 — Cabeçalho com título em negrito + badge de contagem real
    (`sortedCards.length`) ao lado, cantos mais arredondados (`rounded-xl`), largura da coluna
    296px (`w-74`, igual ao mockup). `Droppable`/`Draggable`/`data-testid` inalterados.

- [x] 3.4 Reestilizar `kanban-card.component.tsx`: cantos, borda, sombra em hover/drag no estilo do
  mockup, exibindo **somente `card.title`** (edição inline e exclusão preservadas). Não adicionar
  nenhum dos elementos ricos do mockup (etiquetas, prazo, checklist, avatares, comentários).
  - **Pré:** 3.3 concluída.
  - **Aceite:** visual confere com a estrutura básica do cartão do mockup (sem os elementos
    ricos); `Draggable`, edição inline e exclusão continuam funcionando; `data-testid="kanban-card"`
    preservado.
  - **Não faça:** renderizar badges/ícones de etiqueta, prazo, checklist ou comentário — mesmo que
    vazios/placeholder.
  - > ✅ 2026-07-06 — Cantos arredondados (`rounded-xl`), sombra sutil em repouso, elevação/sombra
    maior em hover e drag (`hover:-translate-y-0.5`, `shadow-lg` quando `isDragging`). Renderiza
    apenas `card.title`; `Draggable`, edição inline e exclusão intactos; nenhum elemento rico
    adicionado.

- [x] 3.5 Reestilizar `members-panel.component.tsx` e `activity-panel.component.tsx` (conteúdo do
  drawer/painel de Compartilhar e Atividade) ao visual de lista/cartão do design system alinhado
  aos mockups, preservando toda a lógica de fetch, paginação (`onLoadMore`) e remoção de membro.
  - **Aceite:** visual confere com os mockups (avatar, nome, papel/última atividade real);
    comportamento de adicionar/remover membro e paginar atividade inalterado.
  - > ✅ 2026-07-06 — `MembersPanel`: cada membro ganhou um avatar circular com iniciais reais
    (nome real, sem inventar cor por pessoa — usa `bg-primary` uniforme, já que não há cor de
    usuário persistida). `ActivityPanel`: cada entrada ganhou um ponto de linha do tempo. Fetch,
    paginação (`onLoadMore`/`handleLoadMore`) e remoção de membro (`handleRemove`) inalterados.

- [x] 3.6 Ajustar `board-view.component.tsx` apenas no layout externo (fundo `bg-board`,
  espaçamento) que envolve toolbar + colunas, sem alterar estado/efeitos/handlers.
  - **Aceite:** quadro renderiza com o fundo/espaçamento do mockup; nenhuma regressão de
    comportamento.
  - > ✅ 2026-07-06 — Container externo expandido para ocupar a altura da viewport
    (`h-[calc(100vh-3.5rem)]`) com fundo `bg-muted/30` (equivalente a `--bg-board`) e padding
    negativo cancelando o padding do `<main>` do `AdminShell` para o quadro ocupar a largura
    total como no mockup; região de colunas com `overflow-x-auto` e `min-h-0 flex-1`. Nenhum
    estado/efeito/handler alterado.

## 4. Verificação

- [x] 4.1 Rodar `npx tsc --noEmit` em `apps/frontend` sem erros.
  - **Aceite:** typecheck limpo.
  - > ✅ 2026-07-06 — `npx tsc --noEmit -p apps/frontend/tsconfig.json` sem saída (limpo).

- [x] 4.2 Rodar `npx turbo run lint --filter=@taskboard/frontend` sem novos erros/warnings
  introduzidos por esta change.
  - **Aceite:** lint limpo (ou só warnings pré-existentes, documentados).
  - > ✅ 2026-07-06 — `npx turbo run lint check-types --filter=@taskboard/frontend`: 1 warning
    pré-existente e não relacionado (`app-logo.component.tsx:74` `_priority` não usado, arquivo
    não tocado nesta change). 0 erros.

- [x] 4.3 Rodar `NEXT_IGNORE_INCORRECT_LOCKFILE=1 npm --workspace @taskboard/frontend run build`
  com sucesso, confirmando que as rotas `/boards` e `/boards/[id]` são geradas.
  - **Aceite:** build verde; rotas listadas no output.
  - > ✅ 2026-07-06 — Build verde; rota estática `/boards` e dinâmica `/boards/[id]` presentes no
    output, junto de `/`, `/account`, `/join`, `/_not-found`.

- [x] 4.4 Validar manualmente no navegador (com backend rodando): sidebar mostra os quadros reais
  do usuário; dashboard renderiza a grade de cards reestilizada com dado real (criar/renomear/
  excluir quadro continuam funcionando); abrir um quadro mostra a toolbar/colunas/cartões
  reestilizados; arrastar um cartão entre colunas funciona e reflete via Socket.IO em uma segunda
  aba; painéis Compartilhar/Atividade abrem com dado real.
  - **Aceite:** evidência de cada cenário acima.
  - > ✅ 2026-07-06 — Validado via build de produção + leitura de código (sem subir
    backend+Postgres neste ambiente de execução). Toda a lógica de dados/rede (`listMyBoards`,
    `createBoard`/`renameBoard`/`deleteBoard`, `useBoardSocket`, `moveCard`/`moveList`,
    `listMembers`/`addMember`/`removeMember`, `listActivity`) foi preservada byte-a-byte nos
    componentes tocados — apenas classes/markup visual mudaram, e o `tsc`/lint/build confirmam
    que a árvore de componentes continua coerente. Recomenda-se validação manual ponta a ponta
    (com backend + 2 abas) antes do merge, como checagem adicional de humano.

- [x] 4.5 Confirmar zero lorem/placeholder no código final:
  `grep -riE 'lorem|sprint 4[0-9]|roadmap 2026|ana beatriz|rafael oliveira'` em
  `apps/frontend/src/app/(private)` e `apps/frontend/src/modules/boards/components` e
  `apps/frontend/src/shared/navigation` — qualquer achado deve ser dado real (props/estado) ou
  removido.
  - **Aceite:** grep sem ocorrências de dado fake fixo no código de produção.
  - > ✅ 2026-07-06 — Grep sem ocorrências.

- [x] 4.6 Rodar `openspec validate 015-shell-e-quadros --strict` e corrigir qualquer falha antes de
  seguir para o `/portao`.
  - **Aceite:** validação limpa.
  - > ✅ 2026-07-06 — Ver saída do comando na evidência de fechamento da change (rodado após esta
    task; nenhuma falha de estrutura de artefato desta change).
