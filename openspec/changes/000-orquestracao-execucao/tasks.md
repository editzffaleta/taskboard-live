<!--
TEMPLATE — ledger de execucao. A `tasks.md` desta 000 e o LEDGER: uma linha por mudanca,
na ordem. Preencha a lista de mudancas do SEU projeto nos grupos por fase (remova/edite os
exemplos). Mantenha os checkboxes vazios; o orquestrador marca cada um com evidencia ao concluir.
-->

> **Disparo:** acione **apenas** o orquestrador a partir desta 000 — `/orquestrar` (ou
> `@orchestrator-fullstack`). Ele dirige o resto sozinho, **sequencialmente**. Nao dispare os
> especialistas a mao nem todos de uma vez.
>
> **Ritual por mudanca** (orquestrador): para cada item, na ordem —
> 1) `openspec status --change "<mudanca>" --json`;
> 2) **analise pre-build** (design §6.2) — `/analisar <mudanca>` (coerencia dos artefatos +
>    Constituicao); FAIL → corrige a change antes de delegar;
> 3) **lancar o(s) especialista(s) necessario(s)** em sub-passos (arquitetura → backend/banco →
>    frontend → e2e → seguranca), cada um com o briefing-padrao (design §8) rodando
>    `/openspec:apply <mudanca>` na sua area — **um por sub-passo, sequencial**;
> 4) **portao de qualidade** (design §7) — `/portao`;
> 5) `/openspec:archive <mudanca>` (e/ou `/openspec:sync`);
> 6) `commit` + marcar o checkbox aqui com evidencia.
> Mudancas leves podem ir inline pelo orquestrador. **Sequencial, nunca paralelo.**
> Evidencia (de `openspec/shared/como-executar.md`):
> `- [x] item` + `> ✅ AAAA-MM-DD HH:MM — o que foi feito, especialista, skills, decisoes, desvios`.

## 0. Preparacao (orquestrador)

- [x] 0.1 Ler `openspec/config.yaml`, `openspec/shared/como-executar.md`,
  `openspec/shared/regras-de-nomenclatura.md` e a Constituicao (`openspec/memory/constitution.md`);
  rodar `openspec list --json` e confirmar todas as mudancas e o schema `spec-driven`.
  - **Aceite:** os arquivos lidos (incl. a `constitution.md`); `openspec list --json` lista as mudancas esperadas.
- [x] 0.2 Confirmar o ambiente (Node/monorepo) pronto para a `001` instalar a base; garantir
  `openspec/EXECUTION-LOG.md` (uma linha por mudanca: data, commit, observacoes). Se o
  diretorio nao for repositorio git, rodar `git init -b main` + commit inicial das specs
  (o ritual exige commit por mudanca).
  - **Aceite:** Node disponivel; `EXECUTION-LOG.md` existe; repositorio git pronto para commits.
- [x] 0.3 Fixar o modelo de execucao (design): orquestrador + especialista por disciplina
  (`.claude/agents/`), um por sub-passo, sequencial, com portao de qualidade entre cada mudanca;
  coordenacao hub-and-spoke (Agent Teams so se a mudanca densa justificar).
  - **Aceite:** modelo confirmado conforme o design; time de agentes presente em `.claude/agents/`.

## 1. Fundacao (base + autenticacao)

- [x] 1.1 `001-base-do-projeto` — base tecnica do monorepo (namespace `@taskboard`, Prisma,
  pacote shared, erros+JWT, rotas/shell, i18n). **Pre:** nenhuma.
- [x] 1.2 `002-design-system-shell` — identidade visual (tokens claro/escuro, fontes, toggle,
  marca, navegacao). **Pre:** `001`.
- [x] 1.3 `003-registro-usuario` — modulo `auth`, agregado `user` (name/email/password),
  `crypto.provider` (bcrypt), `register-user`, `POST /auth/register`, tela `/join`. **Pre:** `001`, `002`.
- [x] 1.4 `004-login-sessao` — `login-user`, JWT `{ sub, name, email }`, `AuthContext`/`AuthGuard`,
  cookie de sessao, protecao do grupo `(private)`. **Pre:** `003`.

## 2. Dominio do kanban em tempo real (o coracao do produto)

> Ordem topologica: o quadro nasce antes do tempo real; o gateway antes de listas/cartoes (que
> emitem eventos por ele); a UI ao vivo depois que os endpoints existem.

- [x] 2.1 `005-quadros-crud` — modulo `board`, agregados `board` + `membership`; CRUD de quadros,
  "meus quadros", owner nasce como membro; guard de acesso por `BoardMember`. **Pre:** `004`.
- [x] 2.2 `006-tempo-real-gateway` — Socket.IO no NestJS: `BoardGateway`, handshake JWT, salas
  `board:{id}` com autorizacao por membro, presenca, e a porta `RealtimeEmitter`. **Pre:** `004`, `005`.
- [x] 2.3 `007-listas-colunas` — agregado `list` (colunas): criar/renomear/excluir/reordenar;
  emite `list.*` via `RealtimeEmitter`. **Pre:** `005`, `006`.
- [x] 2.4 `008-cartoes` — agregado `card`: criar/editar/excluir/mover (entre colunas + posicao);
  emite `card.*` (incl. `card.moved`) via `RealtimeEmitter`. **Pre:** `007`, `006`.
- [x] 2.5 `009-quadro-ao-vivo-ui` — **vitrine**: pagina `/boards/[id]` com colunas/cartoes,
  drag-and-drop (`@hello-pangea/dnd`), cliente `socket.io-client` aplicando eventos ao vivo,
  update otimista + reconciliacao, presenca. **Pre:** `005`, `006`, `007`, `008`.
- [x] 2.6 `010-compartilhamento-membros` — adicionar/remover membros por e-mail (so owner),
  listar; emite `member.added`; painel "Compartilhar" na UI. **Pre:** `005`, `006`, `009`.
- [x] 2.7 `011-atividade-do-quadro` — agregado `activity` + `ActivityRecorder`; feed paginado
  `GET /boards/:id/activity`; entradas ao vivo (`activity.created`) e painel na UI. **Pre:** `006`, `007`, `008`, `009`, `010`.

## 3. Extensoes transversais (opcionais, recomendadas para producao)

> Aplicaveis apos o dominio, respeitando os **Pre:**.

- [x] 3.1 `012-hardening-http` — helmet, CORS explicito (HTTP + Socket.IO), limite de payload,
  rate limit global + estrito em `POST /auth/login` e `POST /auth/register`. **Pre:** `001`, `004`.
- [x] 3.2 `013-fundacao-e2e` — Playwright + smoke de auth + **spec vitrine**: dois navegadores no
  mesmo quadro, um move um cartao e o outro ve ao vivo. **Pre:** `009`, `010`.

## N. Fechamento (orquestrador)

- [x] N.1 Rodar a verificacao final: `npx tsc --noEmit` em `apps/backend` e `apps/frontend`,
  a suite de testes completa (incl. e2e), e `openspec validate --all`.
  - **Aceite:** tsc limpo nos dois apps; suite verde; `validate` sem pendencias (exceto a 000 sem spec).
- [x] N.2 Confirmar no `EXECUTION-LOG.md` que todas as mudancas estao concluidas (portao verde +
  arquivadas + commitadas) e que o build sobe (backend `:4000`, frontend `:3000`).
  - **Aceite:** uma linha por mudanca no log; boot 200 nas duas portas.
