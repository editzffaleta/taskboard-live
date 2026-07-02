# Auditoria — Template "Fábrica Fullstack" (Fase 0)

> Data: 2026-07-02 · Executor: Claude (Fable 5) · Escopo: leitura integral do template, sem alteração.
> Objetivo da refatoração: portabilidade multi-agente + execução à prova de alucinação por modelos fracos, ≤ 250k tokens por change.

---

## 1. Mapa do que existe hoje

### 1.1 Raiz

| Peça | Papel | Estado |
|---|---|---|
| `README.md` (117 linhas) | Visão geral: stack, estrutura, time, comandos, regras de ouro | Bom conteúdo, mas é a única "fonte de verdade" e só o Claude Code a consome via convenção |
| `WORKFLOW.md` (131 linhas) | Guia operacional: setup, projeto novo, loop por feature, referência de skills | Idem — alto sinal, zero portabilidade |
| `.claude/settings.json` | Guardrail: nega `Read` de `.env*` e `secrets/` | Correto; só vale no Claude Code |
| `changes-templates ` | **Nome da pasta tem um ESPAÇO no final** | Bug real: quebra globs, scripts, `cp` documentado no `/inicializar` (que referencia `changes-templates/` sem espaço) |

### 1.2 Agents (`.claude/agents/` — 9 + README)

Hub-and-spoke bem desenhado: `orchestrator-fullstack` (opus) + 8 especialistas com frontmatter `name/description/tools/model`. O orquestrador tem fluxo por change, briefing-padrão (§8 da 000), DoD e condições de parada. Especialistas têm responsabilidade única e lista de skills na ordem canônica.

**Lacunas:** formato de handoff não é fixo (o "resumo curto" não tem template); `tools` permite mas não nega explicitamente; nada disso é lido por outra ferramenta além do Claude Code (subagentes são feature do Claude Code — OpenCode tem `.opencode/agents/`, o resto não tem equivalente direto).

### 1.3 Commands (`.claude/commands/` — 4)

`/inicializar`, `/orquestrar`, `/analisar`, `/portao`. Qualidade acima da média: `/analisar` e `/portao` já têm `allowed-tools` restritivo, checklist numerado e veredito PASS/FAIL.

**Lacunas:** pré-condições nem sempre verificadas com comando (ex.: `/orquestrar` não confere estado do git); `/portao` não roda scanners de segurança (gitleaks/Semgrep/Trivy/audit) — só lint/type/test/build/validate; `/inicializar` copia de `changes-templates/` (caminho que não existe por causa do espaço).

### 1.4 Skills (`.claude/skills/` — 28)

Padrão: `SKILL.md` + `assets/`/`references/` + `agents/openai.yaml` (23 de 28 já têm o adaptador Codex com `display_name/short_description/default_prompt`). Frontmatter `name` + `description` presente em todas; descriptions em geral boas (com gatilhos e anti-gatilhos nas melhores, ex. `deploy-node-ubuntu-vps`, `backend-prisma-repository`).

**Distribuição de tamanho do SKILL.md (linhas):**

| Faixa | Skills |
|---|---|
| > 400 | `frontend-next-config` (484), `spec-backend-auth-basic` (418) |
| 250–400 | `module-entity` (326), `spec-init` (299), `spec-flow` (298), `module-use-case` (298), `deploy-node-ubuntu-vps` (267) |
| 150–250 | `module-repository`, `backend-nest-controller`, `backend-provider-implementation`, `module-value-object`, `shared-validation-rule`, `spec-frontend-auth`, `backend-authorization` |
| < 150 | as demais 14 |

**Assets pesados:** `config-package-shared` (113 arquivos), `frontend-next-config` (75), `backend-nest-config` (22) — ok em si (progressive disclosure via cópia de templates), desde que o SKILL.md não mande *ler* tudo.

### 1.5 Changes (`changes-templates/000…010` — nome corrigido na Fase 1; o original tinha espaço final)

Formato OpenSpec rígido: `proposal.md` + `design.md` + `tasks.md` + `specs/spec.md` + `.openspec.yaml` (a 000 é de processo, sem specs). Tasks já têm `Aceite:`, `Pré:` e "Não faça" — melhor que a média do ecossistema. Tamanhos moderados (proposal 51–77, design 47–142, tasks 45–78, spec 64–133 linhas).

**Lacunas estruturais:**
- **Contrato de leitura ausente**: nenhuma change declara no topo o conjunto exato de arquivos a ler (seção 8 do prompt). O agente descobre via `openspec instructions apply`, o que depende do CLI e não fixa o teto de contexto.
- **`mockups/` não existe**: as changes citam "códigos de tela (D4, D7, A2, B9…) referem-se aos seus mockups" (README das changes; 002/007/008/009/010) mas não há pasta, regra de inclusão condicional nem instrução "layout fiel + dado real".
- **Densidade**: `006` e `008` são marcadas *(densa)* no próprio ledger — candidatas a split. Tasks compostas (ex. 005/3.6 mexe em 3 lugares; 005/2.3 injeta 3 deps + instancia + assina em uma task) elevam risco para modelo fraco.
- **Memória entre resets**: existe `openspec/EXECUTION-LOG.md` (semeado por `spec-conventions`), mas o ritual de *ler no início / atualizar no fim* de cada change não está no topo das changes — só na 000 e no orquestrador.

### 1.6 Segurança e CI já embutidos

`spec-init/assets/` traz: `ci.yml`, `gate.sh`, `dependabot.yml`, githooks, `gitleaks-scan.sh`, `gitleaksignore`, `gitignore.secrets`, `pull_request_template.md`. Ou seja: gitleaks no pre-commit/CI **já é o padrão da casa**. Faltam: Semgrep, Trivy, `npm audit` no gate/CI, `SECURITY.md`, rulesets documentadas, e toda a camada Dokploy/branch `producao`.

**Nota de stack:** o template é **npm workspaces** (README/WORKFLOW/skills). O prompt cita `pnpm audit`; como a regra é *refatorar, não reescrever*, o pipeline usará **`npm audit`** (equivalente funcional). Migrar para pnpm seria mudança de stack fora do escopo — se desejada, vira change própria.

---

## 2. Diagnóstico de risco de contexto/alucinação

Ordenado por severidade (o que mais faria um modelo fraco errar):

1. **[BLOCKER] Pasta `changes-templates ` com espaço final.** O comando documentado `cp -R "changes-templates/"* openspec/changes/` falha silenciosamente ou copia nada; um modelo fraco "conserta" inventando caminho. Correção trivial e prioritária (rename).
2. **[BLOCKER] Ausência de contrato de leitura por change.** Sem a lista fechada de "ler isto e nada mais", o executor tende a abrir o repo inteiro (estouro de contexto) ou a pular leitura obrigatória (alucinação de convenção). É o núcleo do Workstream E.
3. **[ALTO] Portão sem scanners.** `/portao` e `gate.sh` não rodam gitleaks/Semgrep/Trivy/audit ⇒ um agente pode "passar no gate" commitando segredo ou vuln. O gitleaks existe mas só no hook/CI, e hook é opcional no `spec-init`.
4. **[ALTO] Fonte de verdade não portável.** README/WORKFLOW ricos, mas Codex/Cursor/Copilot/Gemini/OpenCode não os leem por convenção. Sem `AGENTS.md`, cada ferramenta parte do zero (ou o usuário duplica — o anti-padrão que queremos evitar). Os `agents/openai.yaml` por skill são um começo, mas cobrem só o Codex e só skills.
5. **[MÉDIO] Skills 250–480 linhas com passos inline.** `frontend-next-config` e `spec-backend-auth-basic` misturam decisão + execução + troubleshooting no arquivo principal. Modelo fraco perde o fio; corrigir com progressive disclosure (SKILL.md ≤ ~150 linhas; detalhe em `references/`).
6. **[MÉDIO] Handoff orquestrador↔especialista sem formato fixo.** "Resumo curto" varia por execução; o orquestrador de modelo fraco não extrai o que precisa. Definir template de retorno (campos fixos).
7. **[MÉDIO] Changes densas (006, 008) e tasks compostas.** Cada task deve caber em "1 ação → 1 arquivo → 1 comando → 1 verificação". Split onde necessário (o prompt autoriza 30+ changes).
8. **[BAIXO] Duplicações que vão divergir**: `gate.sh` existe em `spec-init/assets` E `spec-flow/assets`; regras de ouro repetidas em README e WORKFLOW; ordem canônica de skills repetida em WORKFLOW e `backend-specialist`. Consolidar com ponteiros.
9. **[BAIXO] Nomenclatura do log**: prompt usa `openspec/Execution-LOG`; template usa `openspec/EXECUTION-LOG.md`. Padronizar em **`openspec/EXECUTION-LOG.md`** (já semeado pelos assets) e referenciar assim em todo lugar.
10. **[BAIXO] Deploy atual (`deploy-node-ubuntu-vps`) vira legado.** Bem escrita, mas o alvo passa a ser Dokploy. Arquivar (não deletar) e criar `deploy-dokploy`.

---

## 3. Plano de refatoração em fases

Cada fase termina com: verificação programática indicada + commit (Conventional Commits PT-BR) + resumo ao Bruno. Ordem pensada para destravar dependências (higiene → fonte única → trilhos → operadores → entrega).

| Fase | Entrega | Verificação / checkpoint |
|---|---|---|
| **0** | Esta auditoria (`docs/auditoria.md`) + `git init` | commit `docs: auditoria e plano de refatoração (fase 0)` |
| **1 — Higiene** | Renomear `changes-templates ` → `changes-templates` (sem espaço); corrigir todas as referências; padronizar `EXECUTION-LOG.md` | `grep -r "changes-templates " ` vazio; `bash -n` nos scripts |
| **2 — Portabilidade (Workstream A)** | `AGENTS.md` raiz (≤ 200 linhas, fonte única); `CLAUDE.md` = `@AGENTS.md`; `GEMINI.md` ponteiro; `.github/copilot-instructions.md` ponteiro; `.cursor/rules/000-agents.mdc` (`alwaysApply`); `.windsurf/rules/000-agents.md`; `docs/portabilidade.md` (tabela ferramenta→arquivo) | abrir cada adaptador e conferir que só aponta (zero conteúdo duplicado) |
| **3 — Changes (Workstream E, o núcleo)** | Bloco padrão "Contrato de leitura" no topo de cada `proposal.md`; regra de `mockups/<tela>/` condicional documentada (README das changes + template); split das densas (006 → 006a/006b; 008 → 008a/008b — nomes finais na execução); tasks compostas quebradas; ritual ler-log-no-início / atualizar-log-no-fim explícito na 000 e no topo de cada change | `openspec validate` de amostra; releitura de 2 changes simulando executor fraco |
| **4 — Skills (Workstream B)** | Padrão por skill: frontmatter (`name`, `description` com gatilho/anti-gatilho, `compatibility: claude-code, opencode`), Entradas/Saídas, passos comando→resultado→verificação, 1 exemplo, Do/Don't; progressive disclosure nas ≥ 250 linhas; `deploy-node-ubuntu-vps` → `docs/arquivadas/` (ou `.claude/skills/_arquivadas/`); **nova `deploy-dokploy`** (ver §4.3) | `wc -l` ≤ ~150 nos SKILL.md principais; frontmatter válido em todas |
| **5 — Agents (Workstream C)** | Contrato de handoff fixo (template de briefing e de retorno com campos nomeados); permissões explícitas (allow + deny); responsabilidade única revisada; modelo por agent mantido (opus/sonnet) | leitura cruzada orquestrador↔000↔agents sem contradição |
| **6 — Commands (Workstream D)** | Pré-condições com comando de verificação; tratamento de `$ARGUMENTS`; passos com verificação; pós-condição "concluído"; `/portao` passa a rodar gitleaks + Semgrep + Trivy + `npm audit` e **bloquear** | dry-run textual de cada command |
| **7 — Git/segurança/deploy (Workstream F)** | Branch `producao` (docs + artefatos: Dockerfiles multi-stage por app, compose se necessário, healthcheck, `0.0.0.0`); fluxo de promoção `main→producao` documentado; `SECURITY.md`; `dependabot.yml` revisado; `ci.yml` com Semgrep/Trivy/gitleaks/audit como required checks; rulesets documentadas (Pro); `docs/deploy-dokploy.md` + `docs/seguranca-github.md` | `docker build` dos Dockerfiles (se docker disponível; senão lint estático) ; CI yaml validado |
| **8 — Docs finais** | README/WORKFLOW atualizados (multi-agente + loop por change + Dokploy); `docs/ciclo-de-vida.md` (checklist); revisão dos critérios de aceite (seção 11 do prompt) um a um | checklist de aceite 100% |

Estimativa de granularidade: fases 3 e 4 são as maiores; se alguma ameaçar o orçamento de contexto, quebro em subfases (3a artefatos-padrão, 3b split das densas; 4a skills de fluxo, 4b builders, 4c deploy).

---

## 4. Convenções confirmadas por ferramenta (com fontes)

Pesquisado em 2026-07-02. A tabela do prompt estava certa na direção e desatualizada em 3 pontos (marcados ⚠️).

### 4.1 Arquivos de instrução

| Ferramenta | O que lê (confirmado) | Estratégia adotada |
|---|---|---|
| **AGENTS.md (padrão)** | Formato aberto, Linux Foundation/AAIF; lido nativamente por Codex, Cursor, Copilot, Windsurf, Zed, Amp, Devin, OpenCode e outros; hierárquico (arquivo mais próximo vence) — agents.md; gist "Agents.md best practices" | Fonte única na raiz |
| **Claude Code** | Lê `CLAUDE.md`; suporte nativo a AGENTS.md é **inconsistente entre fontes** (issue anthropics/claude-code#31005 diz que não; posts de jun/2026 dizem que passou a ler como fallback) | ⚠️ Não depender de symlink: **`CLAUDE.md` com a linha `@AGENTS.md`** (import documentado, recursivo, funciona em Windows) + seção Claude-only mínima. Robusto nos dois cenários |
| **OpenCode** | `AGENTS.md` nativo; fallback `CLAUDE.md` se AGENTS.md ausente; **skills**: lê `.opencode/skills/`, `~/.config/opencode/skills/`, **`.claude/skills/`** e `~/.agents/skills/` — formato de SKILL.md idêntico ao Claude Code; campos de frontmatter desconhecidos são ignorados (docs opencode.ai/rules e /skills) | Nada a duplicar. `.claude/skills` permanece canônico; frontmatter ganha `compatibility:` informativo |
| **OpenAI Codex** | `AGENTS.md` hierárquico nativo; trunca acima de `project_doc_max_bytes` | Coberto pela fonte única; manter AGENTS.md enxuto |
| **Cursor** | ⚠️ **Lê `AGENTS.md` nativamente** (não precisa de .mdc para o básico); `.cursor/rules/*.mdc` (frontmatter `description/globs/alwaysApply`) serve para regras com escopo por glob; `.cursorrules` legado é ignorado no Agent mode quando há .mdc | Adaptador `.cursor/rules/000-agents.mdc` com `alwaysApply: true` de 3 linhas ("Siga AGENTS.md") por redundância barata — opcional, mas inofensivo |
| **GitHub Copilot** | ⚠️ **Lê `AGENTS.md` nativamente** (server-side, desde ago/2025) além de `.github/copilot-instructions.md`; instruções por caminho via `applyTo` em `.github/instructions/*.instructions.md` | `.github/copilot-instructions.md` = ponteiro de 2 linhas para AGENTS.md |
| **Gemini CLI** | `GEMINI.md` nativo; aceita AGENTS.md via `settings.json` → `context.fileName` (fontes divergem se já é default) | `GEMINI.md` de 2 linhas apontando para AGENTS.md (não depender de setting do usuário) |
| **Windsurf** | Lê `AGENTS.md` nativamente (listado em agents.md); mantém `.windsurf/rules/` próprio | `.windsurf/rules/000-agents.md` ponteiro — redundância barata |

**Decisão de arquitetura:** ponteiros de 1–3 linhas em vez de symlinks onde houver risco Windows/zip (symlink não sobrevive a `zip` comum nem a checkout Windows sem developer mode). Conteúdo duplicado: zero.

**Registro adicional:** `.agents/skills/` está emergindo como local cross-tool (Codex/Gemini/Cursor/OpenCode leem). Como OpenCode já lê `.claude/skills/` e o Claude Code é o operador principal, **`.claude/skills` segue canônico**; avaliar na Fase 2 um symlink `.agents/skills → .claude/skills` (direção segura; a issue #20820 do Claude Code só reporta problema na direção inversa). Se o teste local falhar, fica só o canônico.

### 4.2 Segurança GitHub — plano Pro, repositório privado

Fontes: docs.github.com ("GitHub security features", "About GitHub Advanced Security").

**Disponível grátis em privado (ativar tudo):** Dependabot alerts + security updates + version updates (`dependabot.yml` já existe nos assets); dependency graph + export SBOM; rulesets/branch protection (PR obrigatório, required status checks, bloqueio de force-push/deleção, commits assinados); `SECURITY.md`.

**NÃO disponível em privado no Pro** (exige Team/Enterprise + GitHub Code Security / Secret Protection): CodeQL code scanning, secret scanning + push protection, **e ⚠️ dependency review (a action em PR)** — este último a tabela do prompt dava como incluído; não é. Cobertura equivalente via CI open-source:

| Buraco | Cobertura no CI/gate |
|---|---|
| Secret scanning/push protection | **gitleaks** (pre-commit + CI) — já é padrão da casa |
| CodeQL (SAST) | **Semgrep** (regras p/ TS/Node) |
| Dependency review | **Trivy fs** + **`npm audit`** no PR (bloqueiam por severidade) |
| Scan de imagem/IaC | **Trivy image/config** no build de deploy |

Repo público: ligar por cima CodeQL default setup + secret scanning + push protection (grátis).

### 4.3 Dokploy (deploy da branch `producao`)

Fontes: docs.dokploy.com (Troubleshooting, Domains/Compose, Utilities/Isolated Deployments, Manual Installation) + guia maks-oleksyuk.

Confirmado e que a skill `deploy-dokploy` vai codificar:
- **App em `0.0.0.0`** (127.0.0.1 = Bad Gateway atrás do Traefik); **não** bindar 80/443 no host (são do Traefik); expor porta interna e rotear por Domains (Traefik labels gerados pelo painel).
- **Healthcheck obrigatório quando houver domínio**: se falhar, o Traefik **não cria a rota** (doc explícita).
- **Isolated Deployments**: liga isolamento de rede por projeto; com ele, não declarar `dokploy-network` manualmente.
- **Env**: variáveis vivem no painel; mudança exige **redeploy/rebuild**. Nuance Compose: env do painel entra no build; para runtime, referenciar explicitamente no compose (`environment:`/`env_file`). A skill trará o exemplo canônico.
- **Persistência**: `code/` é apagado a cada redeploy; tudo persistente vai em `../files/...` ou named volumes.
- **Domínio+HTTPS**: apontar DNS **antes** de criar o domínio no painel (senão o cert Let's Encrypt não emite).
- **Banco**: PostgreSQL gerenciado pelo Dokploy com backup; `DATABASE_URL` via env do painel — **zero segredo no repo** (só `.env.example`).
- **Auto-deploy**: webhook no push para `producao` (integração GitHub nativa).
- **Dockerfile explícito por app** (multi-stage Turborepo, `node:20-alpine`, prune de workspace) — preferido a Nixpacks por determinismo.

### 4.4 Formato de skills/commands/agents (Claude Code)

Confirmado nas docs/uso corrente: skills = pasta com `SKILL.md` (frontmatter `name`+`description`; arquivos de apoio carregados sob demanda — progressive disclosure); commands = md com frontmatter `description/argument-hint/allowed-tools` (o template já usa corretamente); agents = md com `name/description/tools/model`. OpenCode ignora campos extras de frontmatter ⇒ `compatibility:` é seguro.

---

## 5. Dependências novas (justificativa — regra da seção 12)

Nenhuma dependência de runtime. Ferramentas de CI adicionadas: **Semgrep**, **Trivy** (ambas via GitHub Actions oficiais/containers, sem instalar no projeto) e `npm audit` (já vem com o npm). Justificativa: cobrir SAST/dependências/imagem que o plano Pro não entrega em repo privado (§4.2). `gitleaks` já era dependência da casa.

## 6. Pendências que exigem confirmação do Bruno antes de executar

1. Split das changes densas cria novos ids (ex.: `006a`/`006b`) — renumerar ou sufixar? (proposta: **sufixar**, preserva a ordenação topológica sem tocar nas demais).
2. `deploy-node-ubuntu-vps`: arquivar em `.claude/skills/_arquivadas/deploy-node-ubuntu-vps/` (fora do carregamento) — ok?
3. Symlink `.agents/skills → .claude/skills`: criar (com teste) ou pular?
4. Manter npm (recomendado; ver §1.6) ou abrir change de migração p/ pnpm depois?

Nada nas fases 1–8 apaga trabalho: renomes e arquivamentos preservam conteúdo; qualquer operação Git além de `add/commit` em branch local será confirmada antes.
