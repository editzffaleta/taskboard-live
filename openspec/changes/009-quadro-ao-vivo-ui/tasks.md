> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `005` (quadros/rota placeholder), `006` (gateway Socket.IO), `007` (listas),
> `008` (cartões). **Não faça:** nenhum código de backend (endpoints já prontos em `006`/`007`/
> `008`); gestão de membros/convites (`010`); feed de atividade (`011`) — apenas deixe os ganchos
> que o `design.md` descreve. **Princípio:** update otimista sempre reversível; handlers de evento
> de socket sempre idempotentes.

## 1. Dependências e estrutura base

- [ ] 1.1 No `apps/frontend`, instalar `socket.io-client` e `@hello-pangea/dnd` (`npm install socket.io-client @hello-pangea/dnd --workspace=apps/frontend` ou equivalente do monorepo).
  - **Pré:** `apps/frontend/package.json` existe (`001`).
  - **Aceite:** ambas as libs aparecem em `apps/frontend/package.json` como dependências; `npm ls socket.io-client @hello-pangea/dnd` sem erro de missing.
  - **Não faça:** instalar `react-beautiful-dnd` (sem manutenção) nem `dnd-kit` (fora da decisão do `design.md`).

- [ ] 1.2 Confirmar (leitura de código, permitido pelo contrato) os paths reais dos endpoints REST de `005`/`007`/`008` (`GET /boards/:id`, endpoints de listas e cartões, `PATCH .../move`) e o mecanismo de exposição do JWT no cliente definido em `004`.
  - **Aceite:** anotação no início da execução (comentário no PR ou nota no `EXECUTION-LOG.md`) confirmando os paths e o payload exato dos DTOs de `move`.
  - **Não faça:** abrir outras changes além dos controllers/DTOs citados; se algo não existir, registrar como pendência e seguir com o melhor palpite documentado no `design.md`.

## 2. Cliente REST do quadro

- [ ] 2.1 Criar ou estender `apps/frontend/src/lib/boards-api.ts` (skill [frontend-next-config](../../../.claude/skills/frontend-next-config) como referência de estrutura de pastas) com funções `getBoard(id)`, `createList`, `renameList`, `deleteList`, `moveList`, `createCard`, `renameCard`, `deleteCard`, `moveCard`, todas usando o cliente HTTP/fetch já padronizado do frontend (cookie `auth_token` via `credentials: 'include'`).
  - **Pré:** endpoints confirmados na task 1.2.
  - **Aceite:** cada função tipada com o shape descrito em `design.md` (`BoardState`/`ListState`/`CardState`); nenhuma duplica uma função já existente das changes `005`/`007`/`008`.
  - **Não faça:** reimplementar autenticação; duplicar arquivo se `boards-api.ts` (ou equivalente) já existir.

## 3. Hook `useBoardSocket`

- [ ] 3.1 Criar `apps/frontend/src/hooks/use-board-socket.ts` conforme a assinatura e o comportamento descritos em `design.md` (conectar com `auth.token`, `board:join`/`board:leave`, listeners para todos os eventos de domínio, reconexão reemitindo `board:join`).
  - **Pré:** mecanismo de exposição do JWT confirmado na task 1.2.
  - **Aceite:** hook exporta `{ connected }`; aceita objeto de handlers opcionais incluindo `onMemberAdded` e `onActivityAppended` (ganchos para `010`/`011`); desconecta e emite `board:leave` no cleanup do `useEffect`.
  - **Não faça:** implementar retry manual de reconexão (o `socket.io-client` já faz backoff automático); emitir eventos de domínio (isso é do backend).

## 4. Componentes de quadro

- [ ] 4.1 Criar `board-view.tsx` ('use client'): recebe `initialBoard` como prop, mantém `BoardState` em `useState`, monta `DragDropContext` com os `Droppable`s de lista e de cartão descritos em `design.md`, e conecta `useBoardSocket` registrando os handlers de reconciliação (`applyCardMoved`, `applyListMoved`, etc.).
  - **Pré:** tasks 2.1 e 3.1 concluídas.
  - **Aceite:** funções de reconciliação são idempotentes (reaplicar o mesmo evento não duplica nem quebra o estado); reserva o `<aside>` comentado para `010`/`011` conforme `design.md`.
  - **Não faça:** implementar painel de membros ou atividade de verdade — apenas o comentário reservando o espaço.

- [ ] 4.2 Criar `board-column.tsx`: renderiza uma `List` como `Droppable type="CARD"`, título editável inline (renomear via `PATCH`), botão de excluir lista (com confirmação simples) e input de "novo cartão" no fim da coluna.
  - **Aceite:** editar título e pressionar Enter/blur persiste via REST com update otimista e reversão em erro; excluir lista remove otimisticamente e reverte em erro.

- [ ] 4.3 Criar `board-card.tsx`: renderiza um `Card` como `Draggable`, título/descrição editáveis inline, botão de excluir.
  - **Aceite:** edição e exclusão seguem o mesmo padrão otimista-com-reversão da 4.2.

- [ ] 4.4 Criar `board-toolbar.tsx`: nome do quadro, botão "nova lista", indicador discreto de status de conexão do socket (`connected` do hook).
  - **Aceite:** criar lista chama `createList` com update otimista (id temporário substituído pelo id real); indicador de conexão reflete `connected` do `useBoardSocket`.

- [ ] 4.5 Criar `board-presence.tsx`: recebe `users: {id, name}[]` e renderiza até 5 avatares/iniciais sobrepostos + contador "+N".
  - **Aceite:** renderiza corretamente com 0, 1, 5 e mais de 5 usuários (contador aparece só acima de 5).

## 5. Página e integração

- [ ] 5.1 Criar/substituir `apps/frontend/src/app/(private)/boards/[id]/page.tsx`: busca `initialBoard` via REST (task 2.1) no servidor, trata erro 403/404 com estado de erro simples, e renderiza `board-view.tsx` com o dado inicial.
  - **Pré:** tasks 2.1 e 4.1–4.5 concluídas.
  - **Aceite:** navegar para `/boards/:id` de um quadro existente e acessível carrega o quadro completo sem erro de console; quadro inexistente/sem acesso mostra estado de erro amigável.

- [ ] 5.2 Validar manualmente o fluxo de tempo real com duas sessões (duas abas ou dois navegadores autenticados como membros do mesmo quadro): mover um cartão em uma aba reflete ao vivo na outra sem reload; presença mostra ambos os usuários enquanto o quadro está aberto.
  - **Aceite:** evidência registrada (descrição do teste manual) de que `card.moved` e `presence.update` chegam e são aplicados corretamente nas duas sessões.

## 6. Verificação

- [ ] 6.1 Rodar `npx tsc --noEmit` no frontend e `npm run build` do workspace `apps/frontend`.
  - **Aceite:** typecheck e build limpos, sem `any` implícito nos novos arquivos.

- [ ] 6.2 Rodar `bash scripts/ci/gate.sh` (ou o gate configurado) e corrigir qualquer falha antes de abrir o PR.
  - **Aceite:** gate verde.
