> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/quadro-ao-vivo/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`) · e, **somente se o `design.md` citar
> nominalmente**: arquivos de código listados, `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

O TaskBoard Live é um quadro kanban colaborativo em tempo real, mas até aqui o backend só expõe
os endpoints REST de quadros (`005`), listas (`007`), cartões (`008`) e a infraestrutura de tempo
real (`006`) — não existe nenhuma tela onde o usuário efetivamente arraste um cartão e veja outro
membro fazer o mesmo ao vivo. Esta change entrega a página vitrine do produto: o quadro kanban vivo
em `/boards/[id]`, com colunas e cartões arrastáveis, atualização otimista via REST e reconciliação
em tempo real via Socket.IO — a experiência que justifica o nome "Live" do produto.

## What Changes

- Página `app/(private)/boards/[id]/page.tsx`: carrega o quadro (dados do quadro, listas e cartões)
  via REST no carregamento inicial e renderiza o quadro kanban completo.
- Componentes de quadro: coluna (`List`) com título editável inline, botão de criar/excluir lista, e
  cartões (`Card`) com título/descrição editáveis inline e botão de excluir.
- Drag-and-drop com `@hello-pangea/dnd`: arrastar cartões entre colunas e dentro da mesma coluna
  (reordenação), e arrastar colunas para reordenar o quadro. Cada drag aplica a mudança
  **otimisticamente** no estado local e persiste via REST (`PATCH /cards/:id/move`,
  `PATCH /lists/:id/move`); falha na persistência reverte o estado local e mostra erro.
- Hook `useBoardSocket(boardId)`: encapsula a conexão `socket.io-client` (token JWT em
  `auth.token`), emite `board:join` ao montar e `board:leave` ao desmontar/trocar de quadro, assina
  os eventos de domínio (`card.created`, `card.updated`, `card.moved`, `card.deleted`,
  `list.created`, `list.updated`, `list.moved`, `list.deleted`, `member.added`,
  `presence.update`) e expõe callbacks para o componente de página aplicar cada evento no estado
  local, reconciliando com o que já foi otimisticamente aplicado pelo próprio usuário.
- Reconexão: o hook trata `connect`/`disconnect`/`connect_error` do socket, reemitindo
  `board:join` automaticamente após reconectar.
- Presença: exibir avatares/iniciais dos usuários atualmente no quadro, a partir de
  `presence.update`.
- Instalar `socket.io-client` e `@hello-pangea/dnd` no frontend.

## Capabilities

### New Capabilities
- `quadro-ao-vivo`: página de quadro kanban vivo do TaskBoard Live em `/boards/[id]` — carregamento
  REST inicial, drag-and-drop de cartões e listas com atualização otimista e persistência REST,
  hook `useBoardSocket` para reconciliação em tempo real via Socket.IO, presença de usuários
  visualizando o quadro, e CRUD inline de listas e cartões.

### Modified Capabilities
<!-- Nenhuma: a rota placeholder de `/boards/[id]` criada na `005` é substituída pela página
completa aqui; nenhum contrato de outra capability muda. -->

## Impact

- **Backend**: nenhum código — consome os endpoints REST já expostos por `005`/`007`/`008` e o
  gateway Socket.IO já exposto por `006`.
- **Frontend**: página `app/(private)/boards/[id]/page.tsx` (substitui o placeholder da `005`),
  componentes de coluna/cartão, hook `useBoardSocket`, dependências `socket.io-client` e
  `@hello-pangea/dnd`.
- **Domínio**: intocado.
- **Fora de escopo**: convites/gestão de membros além da presença de visualização (`010`), feed de
  atividade do quadro (`011`) — o design deixa pontos de extensão (props/handlers) para ambos.
- **Dependências**: `005` (quadros, rota placeholder e endpoints `/boards`), `006` (gateway
  Socket.IO, eventos e presença), `007` (endpoints de listas), `008` (endpoints de cartões).
- **Habilita**: `010` (compartilhamento de membros) e `011` (atividade do quadro) podem estender a
  mesma página com o painel de membros/convites e o feed de atividade, reutilizando o
  `useBoardSocket` e os pontos de extensão deixados no `design.md`.
