## Context

O design system (`002`), a autenticação (`004`) e o quadro ao vivo (`005`-`012`) já estão
construídos e funcionando. As telas públicas atuais (`app/page.tsx`, `app/(public)/join/page.tsx`)
usam um visual "placeholder" (fundo preto liso, tipografia genérica) que não reflete os tokens
reais do design system (`--primary:#2563EB`, `Inter`/`JetBrains Mono`, tema claro/escuro via
`next-themes`/`ThemeProvider`). Os mockups em `mockups/` (`Landing.dc.html`, `Entrar.dc.html`,
`Estados de Sistema.dc.html`, `Onboarding.dc.html`) já usam esses mesmos tokens — são referências
de **layout e hierarquia visual**, não de dado: todo texto de exemplo (nomes de usuários fictícios
como "Rafael"/"AC"/"RO", cartões "Corrigir sync offline", empresas "Nuvem/Órbita/Vértice") é
ilustração estática do mockup e **não deve virar dado mockado no código** — onde o mockup mostra
dado dinâmico (nome do usuário, lista de quadros, avatares reais), o componente final usa
`AuthContext`/`boards.api.ts`/`useBoardSocket`.

Referências compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Landing pública fiel a `Landing.dc.html` (estrutura, hero, features, CTA), com prévia de quadro
  100% ilustrativa/estática (não busca API — é reprodução do mockup, como o próprio mockup já é).
- `/join` com o layout de `Entrar.dc.html`, preservando 1:1 a lógica de formulário já existente.
- 404, erro de rota, skeletons e indicador de reconexão de socket, com o visual de
  `Estados de Sistema.dc.html`.
- Onboarding guiado (3 passos) de `Onboarding.dc.html`, criando um quadro real via API no passo 1.

**Non-Goals:**
- Nenhuma mudança de backend, schema, contrato de tempo real ou regra de autorização por quadro.
- Nenhum dado fake/lorem persistido ou renderizado condicionalmente a partir de estado real (a
  prévia da landing é decorativa e claramente fora do fluxo autenticado).
- Nenhuma seção institucional inexistente no mockup (preços, blog, carreiras) precisa levar a
  páginas reais — os links do rodapé/nav do mockup que não têm destino no app apontam para `#`
  ou ficam `disabled`, exceto os que já existem (`/join`, `#recursos` como âncora da própria
  página).
- Onboarding não introduz nenhum novo endpoint; reaproveita `createBoard` de `boards.api.ts` e,
  se existir, o endpoint de convite de membro (`members.api.ts`) — sem inventar endpoint novo de
  convite caso não exista ainda.

## Decisions

### Rotas
- **Landing**: `apps/frontend/src/app/(public)/page.tsx` (nova rota `/`, movida do grupo raiz
  `app/page.tsx` para dentro de `(public)` para herdar o layout do grupo, ou mantida em
  `app/page.tsx` se o roteador do Next 16 do projeto não permitir mover a raiz — **decisão exata
  cabe à task de implementação, testando ambas**; o importante é que `/` renderize a landing e
  redirecione para `/boards` quando `useAuth().status === 'authenticated'` (mesmo padrão do
  `useEffect` em `join/page.tsx`). Remove-se o conteúdo antigo de `app/page.tsx`.
- **Entrar**: mesma rota, `apps/frontend/src/app/(public)/join/page.tsx` — só o JSX/estilos mudam.
- **Estados de sistema**: `apps/frontend/src/app/(private)/not-found.tsx` (404 do grupo privado —
  quadro/rota inexistente) e `apps/frontend/src/app/(private)/error.tsx` (client component,
  `'use client'`, recebe `{ error, reset }` — convenção do App Router). Se fizer sentido cobrir
  404 também fora do grupo privado, replicar o mesmo componente visual em
  `apps/frontend/src/app/not-found.tsx` (raiz), reaproveitando um componente compartilhado (ex.:
  `shared/components/ui/system-state.component.tsx`) para não duplicar o mockup em dois lugares.
- **Onboarding**: não é uma rota própria; é um **componente modal/tela cheia** renderizado dentro
  de `app/(private)/boards/page.tsx` (via `BoardsDashboard`) quando `boards.length === 0` **e**
  o carregamento já terminou (`status === 'ready'`) — evita depender de query string ou rota
  dedicada, e mantém o "gatilho simples" pedido: usuário sem nenhum quadro vê o onboarding.

### Componentes novos/alterados
- `apps/frontend/src/modules/marketing/components/landing-page.component.tsx` (ou inline em
  `page.tsx`, dado o tamanho pequeno da página): reproduz `Landing.dc.html` — header, hero, prévia
  de quadro estática, grid de 4 features (`bolt`/`groups`/`visibility`/`history` → ícones
  `lucide-react` equivalentes: `Zap`, `Users`, `Eye`, `History`), CTA final, rodapé. Sem chamada de
  API; todos os CTAs (`Começar grátis`, `Criar meu quadro grátis`, nav `Entrar`) são `Link` para
  `/join`.
- `apps/frontend/src/app/(public)/join/page.tsx`: mantém `RegisterForm`/`LoginForm` e o hook
  `useAuth`/`getMessage` como estão; troca só a árvore de JSX/classes Tailwind pelo layout de
  `Entrar.dc.html` (cartão claro/escuro com sombra, alternância de abas registro/login, campo de
  senha, rodapé "Voltar para o início").
- `apps/frontend/src/shared/components/ui/system-state.component.tsx` (novo): componente genérico
  parametrizável (`icon`, `title`, `description`, `actionLabel`, `onAction`/`href`) que reproduz o
  cartão central de `Estados de Sistema.dc.html` (404 "Página não encontrada" / erro "Algo deu
  errado" / offline). Usado por `not-found.tsx` e `error.tsx`.
- `apps/frontend/src/shared/components/ui/skeleton.tsx` (novo, se ainda não existir primitivo):
  blocos com `animate-pulse` reproduzindo os retângulos cinza do mockup; consumidos por
  `boards-dashboard.component.tsx` (skeleton de cards de quadro, substituindo o texto "Carregando
  quadros...") e por `board-view.component.tsx`/`board-page.component.tsx` (skeleton de colunas do
  quadro enquanto os dados iniciais carregam).
- `apps/frontend/src/hooks/use-board-socket.ts`: hoje `connected` só distingue conectado/não
  conectado, sem diferenciar "nunca conectou ainda" de "caiu e está tentando reconectar". Adicionar
  ao retorno um campo `reconnecting: boolean`, setado como `true` em `socket.on('disconnect', ...)`
  quando `hasConnectedOnce` (novo ref interno) é verdadeiro, e voltando a `false` no próximo
  `connect`. Isso não muda a assinatura existente de `connected` (retrocompatível com quem já
  consome o hook), só adiciona o campo novo ao `UseBoardSocketResult`.
- `apps/frontend/src/modules/boards/components/board-reconnect-banner.component.tsx` (novo):
  banner fixo reproduzindo o indicador "Reconectando… tentativa N" de
  `Estados de Sistema.dc.html`, renderizado por `board-view.component.tsx`/`board-page.component.tsx`
  quando `reconnecting === true`. O contador de tentativa vem do `socket.io-client` nativo
  (`socket.io.on('reconnect_attempt', (n) => ...)`), sem inventar número.
- `apps/frontend/src/modules/boards/components/board-onboarding.component.tsx` (novo): fluxo de 3
  passos reproduzindo `Onboarding.dc.html` (barra de progresso, ilustração por passo, título/texto
  por passo, dots de progresso, botões Voltar/Próximo). Passo 1 tem um `input` real de nome do
  quadro que, ao clicar em "Próximo", chama `createBoard(token, { name })` (de `boards.api.ts`) e
  guarda o `board.id` criado. Passo 2 (convidar) usa o endpoint de membro já existente em
  `members.api.ts` se ele aceitar convite por e-mail; caso o backend só aceite adicionar membro por
  `userId` (não por e-mail), o passo 2 vira **apenas instrutivo** (mostra o link do quadro para
  compartilhar, sem inventar endpoint) — decisão a confirmar lendo `members.api.ts` na
  implementação. Passo 3 é só instrutivo (texto "arraste um cartão"); ao concluir, `router.push`
  para `/boards/{id}` do quadro recém-criado.

### Gatilho do onboarding
- `BoardsDashboard` (`boards-dashboard.component.tsx`) passa a renderizar
  `<BoardOnboarding onFinished={...} />` no lugar do estado vazio atual quando
  `status === 'ready' && boards.length === 0`. Link "Pular introdução" chama `onSkip` e mostra o
  estado vazio normal (o mesmo `EmptyState` de hoje, apenas restilizado se necessário).

### Indicador de reconexão do socket
- Ver decisão acima (`reconnecting` no hook + `board-reconnect-banner.component.tsx`). O gatilho é
  estritamente o evento nativo `disconnect`/`reconnect` do `socket.io-client` já usado pelo hook —
  nenhuma nova infraestrutura de rede é criada.

## Risks / Trade-offs

- [Mover `app/page.tsx` para dentro de `(public)`] → Se o App Router do Next 16 deste projeto não
  aceitar landing dentro de um route group compartilhando a raiz `/`, manter em `app/page.tsx` e
  aplicar o mesmo `ThemeProvider`/tokens manualmente. Registrar a decisão tomada na evidência da
  task.
- [Passo 2 do onboarding sem endpoint de convite por e-mail] → Se `members.api.ts` não suportar
  convite por e-mail, o passo vira somente instrutivo (compartilhar link), sem inventar chamada de
  API inexistente — documentar o desvio na evidência.
- [Duplicar 404 em `(public)` e `(private)`] → Aceito reaproveitando `system-state.component.tsx`
  para não duplicar o mockup; overhead mínimo.
- [Skill indicada não cobrir o caso inteiro] → Aplicar até onde fizer sentido e registrar o desvio
  na evidência.
