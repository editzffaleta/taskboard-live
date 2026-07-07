## Context

Shell, dashboard e quadro já funcionam com dado real desde `005`-`014`. Hoje o visual vem de um
template genérico (`AdminShell`, `AppSidebarNavigation`) e de componentes textuais/minimalistas
(`board-card`, `board-toolbar`, `kanban-card`, `kanban-column`). Os mockups
`mockups/Meus Quadros.dc.html` e `mockups/Quadro ao Vivo.dc.html` definem a identidade visual final
(sidebar de marca com lista de quadros, cards de quadro com capa gradiente, toolbar do quadro com
badge "ao vivo" pulsante e avatares com anel de status, colunas/cartões kanban com o estilo de
canto/hover do mockup). Todo texto/dado do mockup (nomes "Ana Beatriz Costa"/"Sprint 42 · Produto",
contagens "12 cartões", "8 pessoas") é **decoração ilustrativa** — no componente final, cada um
desses pontos vem de `boards.api.ts`/`members.api.ts`/`activity.api.ts`/`AuthContext`/
`useBoardSocket`, nunca hardcoded.

Referências compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Sidebar/topbar do shell privado com o layout de `Meus Quadros.dc.html`/`Quadro ao Vivo.dc.html`
  (idênticos entre as duas telas), usando tokens do design system (`002`) já existentes.
- Dashboard "Meus Quadros" com grade de cards no estilo do mockup (capa gradiente por quadro,
  avatares empilhados, contagem e atividade reais).
- "Quadro ao Vivo" com toolbar/colunas/cartões/painéis reestilizados ao mockup.
- Zero regressão de comportamento: DnD, Socket.IO, CRUD de quadro/lista/cartão, presença, painéis
  de Compartilhar/Atividade, onboarding (`014`), skeletons (`014`) continuam funcionando como
  antes — só muda classe/markup visual.

**Non-Goals:**
- Detalhe de cartão rico (etiquetas, checklist, prazo, responsáveis, comentários, modal de
  detalhe) — changes `016`-`019`.
- Filtros e visões alternativas (Tabela, Calendário, filtro "Responsável"/"Filtrar") — fora de
  escopo, não implementadas nem como placeholder visual funcional.
- Qualquer mudança de endpoint, schema, contrato de tempo real.
- Sidebar com contagem de notificações (badge "3" do mockup) — não há endpoint de notificações no
  projeto; omitir esse elemento (não inventar contador fixo).

## Decisions

### Sidebar/topbar do shell (`app/(private)/layout.tsx`, `shared/template/admin-shell.component.tsx`,
`shared/navigation/app-sidebar-navigation.component.tsx`, `shared/navigation/app-navigation.config.ts`)

- `admin-shell.component.tsx`: manter a mesma API de props (`sidebar`, `children`, `userName`,
  `userEmail`, `onLogout`) — só o markup/classes internos mudam para reproduzir a estrutura de
  `Meus Quadros.dc.html`: aside fixo com largura equivalente a 250px do mockup (usar o breakpoint
  de largura já configurado no design system, ajustando apenas se necessário), header com o
  toggle de tema e o menu do usuário (nome/e-mail reais já vindos de `AuthContext` via
  `(private)/layout.tsx` — não mudam).
- `app-sidebar-navigation.component.tsx` + `app-navigation.config.ts`: reestilizar os itens de
  navegação para o visual do mockup (ícone + label, item ativo destacado com fundo
  `primary-subtle`/texto `primary`). Adicionar, abaixo do menu principal, a seção "Seus quadros"
  do mockup listando os quadros reais do usuário logado (via `listMyBoards`, mesma função que
  `boards-dashboard.component.tsx` já usa) com um indicador de cor por quadro — a cor pode ser
  derivada deterministicamente do `board.id` (ex.: hash simples → paleta fixa de tokens do design
  system), já que não existe campo de cor persistido no `Board`; documentar isso como decisão, não
  como dado inventado (é apresentação, não estado). Item "Notificações"/"Modelos" do mockup:
  omitir "Notificações" (sem endpoint) e manter "Modelos"/"Arquivados" fora do escopo (não
  adicionar rotas novas) — se decidir manter visualmente, marcar como desabilitado, nunca como
  link funcional falso.

### Meus Quadros (`modules/boards/components/boards-dashboard.component.tsx`, `board-card.component.tsx`,
`create-board-dialog.component.tsx`)

- `boards-dashboard.component.tsx`: manter toda a lógica (`listMyBoards`, `handleCreated`,
  `handleRenamed`, `handleDeleted`, estados `loading`/onboarding/empty) intacta; mudar apenas o
  cabeçalho (título + contagem real `${boards.length} quadros`, sem inventar "pessoas no espaço"
  já que não há conceito de workspace/organização no domínio — omitir esse trecho do mockup) e o
  grid de cards para o estilo `grid-template-columns:repeat(auto-fill,minmax(258px,1fr))` do
  mockup (Tailwind: `grid-cols-[repeat(auto-fill,minmax(258px,1fr))]` ou breakpoints equivalentes
  já usados no design system).
- `board-card.component.tsx`: manter toda a lógica de rename/delete/navegação intacta; mudar o
  card para: (a) capa com gradiente (cor derivada do `board.id`, mesma função determinística usada
  na sidebar, para consistência visual entre os dois lugares — extrair para um util compartilhado,
  ex. `modules/boards/utils/board-color.util.ts`), (b) nome do quadro, (c) avatares empilhados dos
  membros reais do quadro — **somente se o `Board`/endpoint já expuser a lista de membros no
  dashboard**; se `listMyBoards` não retornar membros, este ponto do mockup fica com um único
  avatar do owner (dado que já existe) e, se necessário, contagem textual, sem inventar avatares —
  decisão a confirmar lendo `boards.api.ts` na implementação e registrar o desvio na evidência,
  (d) contagem de listas/cartões — só se a API expuser (`Board` hoje não tem esses campos
  agregados conforme o domínio canônico do `project.md`; se não vier do backend, omitir a contagem
  em vez de inventar "4 listas · 12 cartões"), (e) indicador de atividade recente — só se
  `board.updatedAt`/`createdAt` existir; caso não haja timestamp de atividade, omitir "há 2 h" do
  mockup.
- `create-board-dialog.component.tsx`: reestilizar o modal ao layout do mockup (capa de prévia
  decorativa + campo nome), preservando 100% o formulário/chamada `createBoard` existente.

### Quadro ao Vivo (`board-toolbar.component.tsx`, `board-presence.component.tsx`,
`kanban-column.component.tsx`, `kanban-card.component.tsx`, `members-panel.component.tsx`,
`activity-panel.component.tsx`, `board-view.component.tsx`)

- `board-toolbar.component.tsx`: manter toda a lógica de criação de lista/props intacta; mudar o
  indicador de conexão para o badge pulsante "ao vivo" do mockup (ponto verde com `animate-ping` +
  texto), preservando a mensagem "reconectando..." já existente quando `connected === false`
  (reaproveita o work de `014`/`board-reconnect-banner`, não duplica); os botões "Atividade" e
  "Compartilhar" (que hoje abrem `MembersPanel`/`ActivityPanel`) ganham o estilo/ícone do mockup
  (`bolt` → `Zap` do lucide-react, `person_add` → `UserPlus`), mantendo os `data-testid` existentes
  para não quebrar e2e (`013`).
- `board-presence.component.tsx`: reestilizar para avatares sobrepostos com anel verde de "ao vivo"
  (equivalente ao ponto verde `--live` do mockup), mantendo a mesma prop `users: PresenceUser[]`
  vinda de `useBoardSocket` — sem novo estado.
- `kanban-column.component.tsx`/`kanban-card.component.tsza`: reestilizar contador de cartões,
  botão de adicionar cartão, espaçamento e estilo do card (cantos arredondados, borda, sombra no
  hover/drag) — preservando toda a lógica de `Draggable`/`Droppable`, edição inline de título e
  exclusão. **Cartão exibe somente `card.title`** (dado real já existente); nenhuma etiqueta,
  prazo, checklist, avatar de responsável ou contador de comentário é adicionado (ver limite no
  `proposal.md`).
- `members-panel.component.tsx`/`activity-panel.component.tsx`: reestilizar o conteúdo dos
  painéis (lista de membros com avatar/papel real; lista de atividades reais de
  `activity.api.ts`) para o visual de cartão/lista do design system alinhado aos mockups, mantendo
  toda a lógica de fetch/paginação (`onActivitiesLoadMore`) e ações (remover membro) existentes.
- `board-view.component.tsx`: ajustar apenas o layout externo (padding, fundo `bg-board` do
  mockup) que envolve toolbar + colunas; nenhuma mudança de estado/efeitos.

### Utilitário de cor determinística
- Novo `modules/boards/utils/board-color.util.ts`: função pura `getBoardAccentColor(boardId: string): string`
  que mapeia o `id` (hash simples, ex. soma de char codes módulo N) para uma paleta fixa de tokens
  de cor do design system (5-6 cores, mesmas usadas em avatares hoje). Usada por `board-card` e
  pela sidebar para manter a mesma cor de um quadro em ambos os lugares. É apresentação pura, não
  introduz estado nem chamada de rede.

## Risks / Trade-offs

- [Campos que o mockup mostra e a API não expõe hoje — contagem de listas/cartões, "há Xh" de
  atividade, membros no card do dashboard] → Confirmar em `boards.api.ts` durante a implementação;
  se ausentes, omitir o elemento do mockup em vez de inventar dado. Registrar cada omissão na
  evidência da task correspondente.
- [Cor de quadro sem campo persistido] → Aceito usar cor determinística por `id` (puramente
  apresentacional, reproduzível, não é dado inventado sobre o domínio).
- [Skill indicada não cobrir o caso inteiro] → Aplicar até onde fizer sentido e registrar o desvio
  na evidência.
