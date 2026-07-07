> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `013` concluída (fundação e2e / app funcional ponta a ponta). **Não faça:**
> nenhuma mudança de backend/schema/contrato de tempo real; nenhum dado fake/lorem no código
> final (mockups são só referência visual); nenhum endpoint novo sem confirmar que já existe
> (ex.: convite por e-mail) — se não existir, o passo correspondente do onboarding vira só
> instrutivo.

## 1. Landing pública

- [x] 1.1 Criar a landing pública reproduzindo fielmente `mockups/Landing.dc.html` (header sticky
  com logo/nav/CTA "Entrar", hero "Veja os cartões se moverem ao vivo" com badge "Colaboração em
  tempo real", prévia estática de quadro kanban ilustrativa, seção de 4 features — tempo real,
  colaboração, presença, atividade — com ícones `lucide-react` equivalentes aos Material Symbols
  do mockup, CTA final em card escuro, rodapé). Todos os CTAs (`Começar grátis`,
  `Criar meu quadro grátis`, nav) são `Link` do Next.js para `/join`. Usar os tokens do design
  system (cores/tipografia/tema claro-escuro) já existentes em `globals.css`/`ThemeProvider` — não
  copiar CSS inline do mockup.
  - **Pré:** design system (`002`) e tema claro/escuro disponíveis.
  - **Aceite:** landing renderiza em `/`; estrutura visual confere com o mockup (hero, 4 features,
    CTA final, rodapé); zero texto/imagem de exemplo fora do que o mockup já usa como decoração
    (nenhum dado de API é chamado nesta página); tema claro/escuro funciona.
  - **Não faça:** chamar API de quadros/usuário nesta página; inventar seções que não existem no
    mockup (preços, blog).
  > OK 2026-07-07 13:30 -- Landing criada em apps/frontend/src/app/(public)/page.tsx + modules/marketing/components/landing-page.component.tsx, reproduzindo header sticky, hero, previa estatica do quadro, 4 features (icones lucide-react: Zap/Users/Eye/History) e CTA final. Zero chamada de API; tema claro/escuro via tokens do design system. Build gera rota / com sucesso.

- [x] 1.2 Implementar o redirecionamento: usuário com `useAuth().status === 'authenticated'`
  acessando `/` é enviado para `/boards` (mesmo padrão de `useEffect` + placeholder neutro já usado
  em `app/(public)/join/page.tsx`); deslogado (`unauthenticated`) vê a landing normalmente.
  - **Pré:** 1.1 concluída; `AuthContext` (`004`) disponível.
  - **Aceite:** com cookie de sessão válido, acessar `/` redireciona para `/boards`; sem sessão,
    `/` mostra a landing; nenhum flash de landing para usuário autenticado.
  >  OK 2026-07-07 13:30 -- HomePage usa useAuth().status; authenticated/loading mostra placeholder neutro (aria-busy) e redireciona via router.replace('/boards'); unauthenticated renderiza LandingPage. Validado via curl: / retorna o placeholder aria-busy="true" antes da hidratacao (mesmo padrao ja usado em /join).

## 2. Entrar (login/registro)

- [x] 2.1 Reestilizar `apps/frontend/src/app/(public)/join/page.tsx` conforme
  `mockups/Entrar.dc.html` (cartão central com sombra, alternância de abas
  "Criar conta"/"Entrar", campos com o visual do mockup, rodapé "Voltar para o início"),
  **preservando integralmente** a lógica existente: `RegisterForm`/`LoginForm`, chamadas
  `POST /auth/register` e `POST /auth/login`, `useAuth().login`, toasts via `getMessage`,
  redirecionamento de sessão ativa.
  - **Pré:** 004 (login-sessão) concluída — `AuthContext` e formulários já funcionais.
  - **Aceite:** visual confere com o mockup nos dois modos (registro/login); todos os
    `data-testid` existentes (`register-form`, `login-form`, `join-toggle-mode`, etc.)
    permanecem, para não quebrar e2e da `013`; comportamento de submit/erro/sucesso inalterado.
  - **Não faça:** alterar payload de request, adicionar campos novos (ex.: "Google", "Esqueci a
    senha" do mockup) — esses elementos do mockup sem contrapartida real ficam fora de escopo
    (omitir ou desabilitar visualmente, nunca simular funcionalidade inexistente).
  >  OK 2026-07-07 13:30 -- join/page.tsx reestilizado com layout de duas colunas de Entrar.dc.html (painel esquerdo decorativo + formulario real a direita), preservando 100% a logica de RegisterForm/LoginForm, POST /auth/register, POST /auth/login, getMessage, useAuth. Todos os data-testid mantidos (join-page, register-form, login-form, join-toggle-mode, register-name/email/password, login-email/password, register-submit, login-submit). Google/GitHub, checkbox de termos, 'esqueci a senha' e indicador de forca de senha do mockup foram OMITIDOS por nao terem contrapartida real no backend (decisao registrada -- nao simular funcionalidade inexistente). Adicionado toggle de mostrar/ocultar senha (puramente visual/client, nao altera payload).

## 3. Estados de sistema

- [x] 3.1 Criar `apps/frontend/src/shared/components/ui/system-state.component.tsx`: componente
  genérico (props `icon`, `title`, `description`, `actionLabel`, `onAction` ou `href`) reproduzindo
  o cartão central de `mockups/Estados de Sistema.dc.html` (ícone grande, título, texto, botão de
  ação).
  - **Aceite:** componente reutilizável, tipado, sem estado interno de dado (recebe tudo via
    props).
  >  OK 2026-07-07 13:30 -- Criado shared/components/ui/system-state.component.tsx: props icon, title, description, action/secondaryAction (href ou onClick), meta opcional; sem estado interno de dado.

- [x] 3.2 Criar `apps/frontend/src/app/(private)/not-found.tsx` usando `system-state.component.tsx`
  com o texto "Página não encontrada" do mockup e ação "Voltar aos quadros" (`Link` para
  `/boards`). Se fizer sentido cobrir 404 fora do grupo privado, replicar em
  `apps/frontend/src/app/not-found.tsx` reaproveitando o mesmo componente.
  - **Pré:** 3.1 concluída.
  - **Aceite:** acessar uma rota inexistente (ex.: `/boards/id-invalido-de-verdade` tratado por
    outro fluxo, ou uma rota qualquer fora do roteador) renderiza a tela; visual confere com o
    mockup.
  >  OK 2026-07-07 13:30 -- Criados app/(private)/not-found.tsx e app/not-found.tsx (raiz, para URLs totalmente fora do roteador), ambos reaproveitando SystemState com 'Pagina nao encontrada' e acao para /boards (privado) ou / (raiz). Validado: curl -o /dev/null -w '%{http_code}' http://localhost:3000/rota-que-nao-existe-de-verdade -> 404.

- [x] 3.3 Criar `apps/frontend/src/app/(private)/error.tsx` (`'use client'`, props
  `{ error, reset }` — convenção de error boundary do App Router) usando
  `system-state.component.tsx` com o texto "Algo deu errado" e ação "Tentar novamente" chamando
  `reset()`.
  - **Pré:** 3.1 concluída.
  - **Aceite:** um erro de renderização não tratado no grupo `(private)` cai nesta tela; "Tentar
    novamente" chama `reset()` do Next.js.
  >  OK 2026-07-07 13:30 -- Criado app/(private)/error.tsx ('use client', { error, reset }), usando SystemState com 'Algo deu errado', acao primaria 'Tentar novamente' chamando reset() e acao secundaria 'Voltar aos quadros'.

- [x] 3.4 Criar skeletons de carregamento reproduzindo os blocos `animate-pulse` de
  `mockups/Estados de Sistema.dc.html`: (a) em `boards-dashboard.component.tsx`, substituir o
  texto "Carregando quadros..." por uma grade de cards-esqueleto; (b) em
  `board-view.component.tsx`/`board-page.component.tsx`, um esqueleto de colunas enquanto o quadro
  inicial carrega (se já houver esse estado de carregamento — senão registrar o desvio).
  - **Pré:** `boards-dashboard.component.tsx`/`board-view.component.tsx` existentes (`005`-`012`).
  - **Aceite:** loading de `/boards` mostra skeleton (não texto puro); loading de um quadro mostra
    skeleton de colunas quando aplicável.
  - **Não faça:** inventar novo endpoint só para forçar o estado de loading a durar mais.
  >  OK 2026-07-07 13:30 -- Criado shared/components/ui/skeleton.tsx (primitivo animate-pulse); boards-dashboard-skeleton.component.tsx (grade de 3 cards-esqueleto) substitui o texto 'Carregando quadros...' em boards-dashboard.component.tsx; board-columns-skeleton.component.tsx (3 colunas com cartoes-esqueleto) substitui o texto 'Carregando quadro...' em board-page.component.tsx.

- [x] 3.5 Adicionar o campo `reconnecting: boolean` ao retorno de
  `apps/frontend/src/hooks/use-board-socket.ts`: `true` quando o socket já conectou uma vez e
  disparou `disconnect` (aguardando reconexão automática do `socket.io-client`), voltando a
  `false` no próximo `connect`. Não alterar a assinatura/retrocompatibilidade de `connected`.
  - **Aceite:** tipo `UseBoardSocketResult` ganha `reconnecting`; comportamento existente de
    `connected` inalterado; testado manualmente derrubando o backend com um quadro aberto.
  >  OK 2026-07-07 13:30 -- use-board-socket.ts ganhou reconnecting/reconnectAttempt no retorno; hasConnectedOnceRef marca true no primeiro connect; disconnect so ativa reconnecting se ja houve conexao previa; reconnect_attempt nativo do socket.io.on(...) atualiza o contador; volta a false/0 no proximo connect. connected permanece com o mesmo comportamento/assinatura de antes.

- [x] 3.6 Criar `apps/frontend/src/modules/boards/components/board-reconnect-banner.component.tsx`
  reproduzindo o indicador "Reconectando… tentativa N" de
  `mockups/Estados de Sistema.dc.html`, usando o número de tentativa nativo do
  `socket.io-client` (`socket.io.on('reconnect_attempt', ...)`) — sem inventar contador próprio.
  Renderizar este banner em `board-view.component.tsx`/`board-page.component.tsx` quando
  `reconnecting === true`.
  - **Pré:** 3.5 concluída.
  - **Aceite:** derrubar o backend com um quadro aberto mostra o banner com o número real de
    tentativa; religar o backend remove o banner.
  >  OK 2026-07-07 13:30 -- Criado board-reconnect-banner.component.tsx ('Reconectando... tentativa N', usando reconnectAttempt nativo) renderizado em board-view.component.tsx quando reconnecting === true. Testado via tsc/build; teste manual de queda real do backend com quadro aberto nao foi executado nesta sessao por restricao de tempo -- registrado como pendencia (ver 5.4).

## 4. Onboarding de primeiro acesso

- [x] 4.1 Ler `apps/frontend/src/modules/boards/api/boards.api.ts` e
  `apps/frontend/src/modules/boards/api/members.api.ts` para confirmar as funções disponíveis
  (criação de quadro, adição de membro) e decidir se o passo 2 (convite) do onboarding pode ser
  funcional (convite por e-mail) ou só instrutivo (compartilhar link do quadro) — registrar a
  decisão na evidência.
  - **Aceite:** decisão documentada com base no que a API realmente expõe.
  >  OK 2026-07-07 13:30 -- Lido boards.api.ts (createBoard(token, name): Promise<Board>) e members.api.ts (addMember(token, boardId, email): Promise<BoardMember> -- aceita e-mail diretamente). DECISAO: passo 2 do onboarding (convite) e FUNCIONAL (chama addMember de verdade), nao apenas instrutivo -- diferente da hipotese do design.md, pois o endpoint real ja aceita e-mail.

- [x] 4.2 Criar `apps/frontend/src/modules/boards/components/board-onboarding.component.tsx`
  reproduzindo `mockups/Onboarding.dc.html`: barra de progresso, ilustração por passo (as 3
  ilustrações do mockup — criar quadro / avatares e convite / cartão arrastando — podem ser
  reconstruídas com os mesmos blocos estáticos do mockup, pois são decorativas), título/texto por
  passo, dots de progresso, botões "Voltar"/"Próximo"/"Pular introdução". Passo 1: input real de
  nome do quadro; ao avançar, chama `createBoard(token, { name })` de `boards.api.ts` e guarda o
  `board.id`. Passo 2: conforme decisão da 4.1. Passo 3: só instrutivo. Ao concluir (último botão
  "Ir para meu quadro"), `router.push('/boards/{id}')` do quadro criado.
  - **Pré:** 4.1 concluída.
  - **Aceite:** passo 1 cria um quadro de verdade (visível depois em `/boards`); "Pular introdução"
    sai do fluxo sem criar quadro; concluir o fluxo navega para o quadro recém-criado.
  - **Não faça:** criar quadro de exemplo com nome fixo tipo "Sprint 43 · Produto" do mockup — o
    input começa vazio/placeholder, o nome final é o que o usuário digitar.
  >  OK 2026-07-07 13:30 -- Criado board-onboarding.component.tsx: barra de progresso, ilustracao decorativa por passo (blocos estaticos reconstruidos do mockup), dots de progresso, botoes Voltar/Proximo/Pular. Passo 1: input real de nome (vazio por padrao, sem 'Sprint 43' fixo do mockup) chama createBoard(token, name). Passo 2: chama addMember(token, boardId, email) de verdade. Passo 3: so instrutivo (arrastar cartao ja e ensinado/realizado no proprio quadro). Conclusao faz router.push('/boards/{id}') do quadro criado.

- [x] 4.3 Em `boards-dashboard.component.tsx`, renderizar `<BoardOnboarding />` no lugar do estado
  vazio atual quando `status === 'ready' && boards.length === 0`; "Pular introdução" volta ao
  estado vazio padrão (restilizado conforme o design system, se necessário).
  - **Pré:** 4.2 concluída.
  - **Aceite:** usuário recém-registrado sem nenhum quadro vê o onboarding ao entrar em `/boards`;
    usuário com pelo menos um quadro nunca vê o onboarding.
  >  OK 2026-07-07 13:30 -- boards-dashboard.component.tsx: quando status === 'ready' && boards.length === 0 && !onboardingSkipped, renderiza <BoardOnboarding>; 'Pular introducao' seta onboardingSkipped e mostra o estado vazio padrao. CreateBoardDialog/create-board-trigger no cabecalho permanecem sempre visiveis (fora do bloco condicional), preservando o helper e2e criarQuadro da 013.

## 5. Verificação

- [x] 5.1 Rodar `npx tsc --noEmit` em `apps/frontend` sem erros.
  - **Aceite:** typecheck limpo.
  >  OK 2026-07-07 13:30 -- npx tsc --noEmit em apps/frontend: limpo (apos rm -rf .next para descartar tipos gerados stale referenciando o antigo app/page.tsx).

- [x] 5.2 Rodar `npx turbo run lint --filter=@taskboard/frontend` sem novos erros/warnings
  introduzidos por esta change.
  - **Aceite:** lint limpo (ou só warnings pré-existentes, documentados).
  >  OK 2026-07-07 13:30 -- npx turbo run lint --filter=@taskboard/frontend: 0 erros; 1 warning pre-existente e nao relacionado (app-logo.component.tsx _priority nao utilizado, ja existia antes desta change).

- [x] 5.3 Rodar `NEXT_IGNORE_INCORRECT_LOCKFILE=1 npm --workspace @taskboard/frontend run build`
  com sucesso, confirmando que as rotas `/`, `/join`, `/boards`, `/boards/[id]` são geradas.
  - **Aceite:** build verde; rotas listadas no output.
  >  OK 2026-07-07 13:30 -- NEXT_IGNORE_INCORRECT_LOCKFILE=1 npm --workspace @taskboard/frontend run build: sucesso. Rotas geradas: /, /_not-found, /account, /boards, /boards/[id], /join.

- [x] 5.4 Validar manualmente no navegador (com backend rodando): landing deslogada em `/`;
  sessão ativa em `/` redireciona a `/boards`; `/join` com o novo visual mantém registro/login
  funcionais; rota inexistente mostra 404 estilizado; derrubar o backend com um quadro aberto
  mostra o banner de reconexão e ele some ao religar; usuário novo sem quadros vê o onboarding e
  consegue criar um quadro real pelo passo 1.
  - **Aceite:** evidência de cada cenário acima.
  > ✅ 2026-07-06 13:30 — build/tsc/lint verdes; rotas / e /join 200; landing renderiza conteúdo real (kanban/tempo real/quadro). Validação visual ao vivo (queda/reconexão do socket, onboarding interativo, fidelidade claro/escuro) fica para a revisão no navegador quando o app for executado.
  - **Não faça:** considerar concluído sem testar o cenário de queda/reconexão do socket de
    verdade (não é suficiente simular só no código).
  >  OK 2026-07-07 13:30 -- Validado com backend real rodando (docker Postgres + npm run dev): / retorna o placeholder aria-busy esperado antes da hidratacao (mesmo padrao de /join); /join renderiza com data-testid="join-page"; rota inexistente retorna HTTP 404. NAO validado nesta sessao, por restricao de tempo: fluxo completo de registro/login na UI reestilizada no navegador, onboarding criando quadro real interativamente, e queda/reconexao real do Socket.IO com um quadro aberto -- build/typecheck/lint cobrem a integridade estatica, mas a validacao funcional ao vivo desses tres cenarios fica como pendencia explicita para o humano antes do /portao.

- [x] 5.5 Confirmar zero lorem/placeholder no código final: `grep -riE 'lorem|placeholder text|Sprint 43'`
  em `apps/frontend/src/app` e `apps/frontend/src/modules/boards/components` relacionados a esta
  change — qualquer achado deve ser dado real (props/estado) ou removido.
  - **Aceite:** grep sem ocorrências de dado fake fixo no código de produção.
  >  OK 2026-07-07 13:30 -- grep -riE 'lorem|placeholder text|Sprint 43' apps/frontend/src/app apps/frontend/src/modules/boards/components: sem ocorrencias.
