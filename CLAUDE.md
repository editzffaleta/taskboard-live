@AGENTS.md

## Somente Claude Code (extras nativos)

- **Subagentes** em `.claude/agents/` — dispare o fluxo pelo comando `/orquestrar`
  (hub-and-spoke: orquestrador delega; especialistas não conversam entre si).
- **Slash commands** em `.claude/commands/`: `/inicializar`, `/orquestrar`, `/analisar`, `/portao`.
- **Skills** em `.claude/skills/` — carregadas automaticamente pela `description`.
- Guardrail de segredos em `.claude/settings.json` (nega leitura de `.env*`/secrets).
