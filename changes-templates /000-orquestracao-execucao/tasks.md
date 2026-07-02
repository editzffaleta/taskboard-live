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

- [ ] 0.1 Ler `openspec/config.yaml`, `openspec/shared/como-executar.md`,
  `openspec/shared/regras-de-nomenclatura.md` e a Constituicao (`openspec/memory/constitution.md`);
  rodar `openspec list --json` e confirmar todas as mudancas e o schema `spec-driven`.
  - **Aceite:** os arquivos lidos (incl. a `constitution.md`); `openspec list --json` lista as mudancas esperadas.
- [ ] 0.2 Confirmar o ambiente (Node/monorepo) pronto para a `001` instalar a base; garantir
  `openspec/EXECUTION-LOG.md` (uma linha por mudanca: data, commit, observacoes). Se o
  diretorio nao for repositorio git, rodar `git init -b main` + commit inicial das specs
  (o ritual exige commit por mudanca).
  - **Aceite:** Node disponivel; `EXECUTION-LOG.md` existe; repositorio git pronto para commits.
- [ ] 0.3 Fixar o modelo de execucao (design): orquestrador + especialista por disciplina
  (`.claude/agents/`), um por sub-passo, sequencial, com portao de qualidade entre cada mudanca;
  coordenacao hub-and-spoke (Agent Teams so se a mudanca densa justificar).
  - **Aceite:** modelo confirmado conforme o design; time de agentes presente em `.claude/agents/`.

<!--
A PARTIR DAQUI: liste as mudancas do seu projeto, agrupadas por fase, na ordem topologica.
Cada item: `- [ ] N.M <mudanca>` + `**Pre:**` (dependencias) + uma linha do que ela entrega.
Exemplos do nucleo de plataforma (ajuste/remova conforme o seu projeto):
-->

## 1. Fundacao

- [ ] 1.1 `001-base-do-projeto` — base tecnica do monorepo (namespace, Prisma, pacote shared,
  erros+JWT, rotas/shell, i18n). **Pre:** nenhuma.
- [ ] 1.2 `002-design-system-shell` — identidade visual (tokens claro/escuro, fontes, toggle,
  marca, navegacao por secoes). **Pre:** `001`.
- [ ] 1.3 `003-multi-tenancy-organizacao` — modulo `tenancy`, agregado `organization`, escopo
  por `organizationId`, seed da org default. **Pre:** `001`.
- [ ] 1.4 `004-registro-usuario` — modulo `auth`, agregado `user`, `crypto.provider`,
  `register-user`, `/auth/register`. **Pre:** `003`.
- [ ] 1.5 `005-login-sessao` — `login-user`, JWT (`role`+`organizationId`), `AuthContext`/`AuthGuard`. **Pre:** `003`, `004`.
- [ ] 1.6 `006-rbac-permissoes` — catalogo de permissoes, modulo `access`, guards de papel/permissao, bootstrap do admin. **Pre:** `004`, `005`. *(densa)*

## 2. Pessoas

- [ ] 2.1 `007-estrutura-organizacional` — agregados de estrutura, CRUD admin. **Pre:** `003`, `006`.
- [ ] 2.2 `008-cadastro-colaboradores` — usuario com estrutura, aprovacao, convites. **Pre:** `006`, `007`, `004`. *(densa)*
- [ ] 2.3 `009-mfa-recuperacao-primeiro-acesso` — MFA TOTP, login em duas etapas, reset/1º acesso. **Pre:** `005`, `004`.
- [ ] 2.4 `010-perfil-usuario` — autosservico `/me` (perfil, troca de senha). **Pre:** `005`, `004`.

<!-- ## 3. <proxima fase do seu produto> ... -->

## N. Fechamento (orquestrador)

- [ ] N.1 Rodar a verificacao final: `npx tsc --noEmit` em `apps/backend` e `apps/frontend`,
  a suite de testes completa (incl. e2e), e `openspec validate --all`.
  - **Aceite:** tsc limpo nos dois apps; suite verde; `validate` sem pendencias (exceto a 000 sem spec).
- [ ] N.2 Confirmar no `EXECUTION-LOG.md` que todas as mudancas estao concluidas (portao verde +
  arquivadas + commitadas) e que o build sobe (backend `:4000`, frontend `:3000`).
  - **Aceite:** uma linha por mudanca no log; boot 200 nas duas portas.
