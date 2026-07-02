# Portabilidade multi-agente — qual arquivo cada ferramenta lê

Arquitetura: **fonte única (`AGENTS.md`) + adaptadores finos**. Zero conteúdo duplicado —
todo adaptador só aponta. Convenções confirmadas por pesquisa em 2026-07-02 (fontes na
`docs/auditoria.md`, §4.1); este ecossistema muda rápido — reconfirme antes de grandes upgrades.

| Ferramenta | O que lê | O que este repo fornece |
|---|---|---|
| **AGENTS.md (padrão aberto)** | `AGENTS.md` raiz, hierárquico (o mais próximo do arquivo editado vence) | A fonte única. Codex, Cursor, Copilot, Windsurf, Zed, Amp, Devin e OpenCode leem nativamente |
| **Claude Code** | `CLAUDE.md` (import `@arquivo` suportado) | `CLAUDE.md` = `@AGENTS.md` + seção Claude-only (subagentes/commands/skills). Import em vez de symlink: funciona em Windows e independe do suporte nativo a AGENTS.md, que ainda oscila entre versões |
| **OpenAI Codex** | `AGENTS.md` nativo (cascata por subpasta; trunca acima de `project_doc_max_bytes`) | Nada extra. Se um dia precisar de instrução por subpasta, crie `AGENTS.md` aninhado |
| **Cursor** | `AGENTS.md` nativo **e** `.cursor/rules/*.mdc` (frontmatter `description`/`globs`/`alwaysApply`) | `.cursor/rules/000-agents.mdc` (`alwaysApply: true`) como redundância barata. Novas `.mdc` só para escopo por glob |
| **GitHub Copilot** | `AGENTS.md` nativo (server-side) **e** `.github/copilot-instructions.md` | Ponteiro em `.github/copilot-instructions.md`. Instrução por caminho: `.github/instructions/*.instructions.md` com `applyTo:` |
| **Gemini CLI** | `GEMINI.md`; aceita `AGENTS.md` via `settings.json → context.fileName` | `GEMINI.md` ponteiro (não depende de setting do usuário) |
| **OpenCode** | `AGENTS.md` nativo; fallback `CLAUDE.md`; **skills** de `.opencode/skills/`, **`.claude/skills/`**, `~/.agents/skills/` — formato SKILL.md idêntico ao Claude Code | Nada a duplicar: skills canônicas em `.claude/skills/` já são lidas. Frontmatter extra é ignorado sem erro |
| **Windsurf** | `AGENTS.md` nativo e `.windsurf/rules/` | `.windsurf/rules/000-agents.md` ponteiro |

## Ativos ricos (skills / agents / commands)

- **Canônico:** `.claude/skills/` (28 skills). O symlink **`.agents/skills → .claude/skills`**
  atende ferramentas que buscam no local cross-tool emergente (Codex CLI, Gemini, Cursor,
  OpenCode). Direção segura: o Claude Code continua escrevendo metadados só no canônico.
- **Adaptador Codex por skill:** `agents/openai.yaml` (display_name/short_description/
  default_prompt) — já presente em 23 skills; completar nas 5 restantes faz parte da Fase 4.
- **Subagentes** (`.claude/agents/`) e **slash commands** (`.claude/commands/`) são features
  do Claude Code (OpenCode tem análogos em `.opencode/agents|commands/`). Fora deles, o
  fluxo continua executável **manualmente**: qualquer agente segue o loop descrito no
  `AGENTS.md` + trilho da `000` — os commands são atalhos, não pré-requisitos.

## Notas de manutenção

- **Windows/zip:** o symlink `.agents/skills` requer Git com symlinks habilitados
  (Developer Mode no Windows) e não sobrevive a `zip` comum. Se o clone perder o link,
  recrie: `ln -s ../.claude/skills .agents/skills` — nada mais depende dele.
- **Regra de ouro:** nova regra universal → edite `AGENTS.md`. Nunca adicione conteúdo a um
  adaptador; se um adaptador crescer além de apontar, é regressão.
