> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/telas-publicas/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/telas-publicas/spec.md`, `mockups/`) · e,
> **somente se o `design.md` citar nominalmente**: arquivos de código listados,
> `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

O TaskBoard Live já tem autenticação real (`004`), quadro ao vivo (`005`-`012`) e fundação e2e
(`013`), mas as telas públicas ainda estão em rascunho: a landing (`app/page.tsx`) é um placeholder
genérico sem os tokens visuais do design system, `/join` funciona mas não segue o layout de
"Entrar" do Claude Design, não há tratamento visual para 404/erro/reconexão de socket, e usuários
novos caem direto no dashboard vazio sem nenhum guia. Esta change reestiliza as telas públicas com
fidelidade aos mockups de alta fidelidade em `mockups/` (tokens reais do projeto: `#2563EB`,
Inter/JetBrains Mono, tema claro/escuro) e cobre os estados de sistema que faltam, sem inventar
nenhum dado — tudo com o backend e o `AuthContext`/`useBoardSocket` já existentes.

## What Changes

- Criar a landing pública em `app/(public)/page.tsx` (ou equivalente na raiz do grupo `public`)
  reproduzindo `Landing.dc.html`: header sticky, hero "veja os cartões se moverem ao vivo",
  prévia de quadro estática (ilustrativa, sem chamada de API), seção de recursos (tempo real,
  colaboração, presença, atividade) e CTA final — todos os `href`/`Link` apontando para `/join`.
  Deslogado vê a landing; sessão ativa redireciona para `/boards` (mesmo padrão do `AuthContext`
  já usado em `/join`).
- Reestilizar `app/(public)/join/page.tsx` conforme `Entrar.dc.html` (cartão de autenticação,
  alternância registro/login, tokens do design system), **mantendo intacta** a integração real
  já existente (`POST /auth/register`, `POST /auth/login`, toasts via `getMessage`, `AuthContext`).
  Só o visual muda; nenhum campo/fluxo novo.
- Implementar os estados de sistema de `Estados de Sistema.dc.html`: `not-found.tsx` (404),
  `error.tsx` (erro genérico da rota), skeletons de carregamento para dashboard e quadro (hoje
  textuais em `boards-dashboard.component.tsx`/`board-view.component.tsx`), e um indicador visual
  de "reconectando…" quando `useBoardSocket` reportar `connected: false` após já ter conectado
  uma vez.
- Implementar o onboarding de `Onboarding.dc.html`: fluxo guiado de 3 passos (criar primeiro
  quadro / convidar alguém / arrastar um cartão) com ações reais (criação de quadro via
  `boards.api.ts`), disparado quando o usuário autenticado não possui nenhum quadro.

## Capabilities

### New Capabilities
- `telas-publicas`: landing pública, tela de entrada (login/registro) reestilizada, estados de
  sistema (404, erro, skeleton, reconexão de socket) e onboarding guiado de primeiro acesso — tudo
  só de frontend, reaproveitando os endpoints e contextos já existentes.

### Modified Capabilities
<!-- Nenhuma. -->

## Impact

- **Frontend (`apps/frontend/src/app`)**: nova landing pública; `app/(public)/join/page.tsx`
  reestilizado (mesma lógica); `app/(private)/not-found.tsx`, `app/(private)/error.tsx` (e
  equivalentes em `(public)` se fizer sentido); skeletons em `boards-dashboard.component.tsx` e
  `board-view.component.tsx`/`board-page.component.tsx`.
- **Frontend (`apps/frontend/src/modules`)**: possível ajuste em `use-board-socket.ts` para expor
  um estado de "reconectando" (distinto de "nunca conectou"); novo fluxo de onboarding em
  `modules/boards` ou `modules/onboarding`, consumindo `boards.api.ts` para criar o primeiro
  quadro de verdade.
- **Fora de escopo**: qualquer mudança de backend, schema Prisma, contrato de tempo real ou
  autorização por quadro; qualquer dado fake/lorem no código final (mockups servem só de
  referência visual).
